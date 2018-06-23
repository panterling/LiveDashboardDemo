
import java.io.{ByteArrayOutputStream, Serializable}

import io.confluent.kafka.serializers.{KafkaAvroDeserializer, KafkaAvroDeserializerConfig, KafkaAvroSerializer}
import org.apache.kafka.clients.producer.{KafkaProducer, Producer, ProducerConfig, ProducerRecord}
import org.apache.spark._
import org.apache.spark.streaming._
import org.apache.kafka.common.serialization.{ByteArrayDeserializer, StringDeserializer}
import org.apache.spark.streaming.kafka010._
import org.apache.spark.streaming.kafka010.LocationStrategies.PreferConsistent
import org.apache.spark.streaming.kafka010.ConsumerStrategies.Subscribe
import org.json._
import java.util.Properties

import org.apache.avro.Schema
import org.apache.avro.generic.{GenericData, GenericRecord}
import org.apache.avro.io._
import org.apache.avro.specific.{SpecificDatumReader, SpecificDatumWriter, SpecificRecord}

import scala.collection.Map
import scala.io.Source

// CONSUMING
class User () extends SpecificRecord with Serializable {

  var value: Double = 0.0
  var timestamp: Long = 0

  override def put(i: Int, v: scala.Any): Unit = {
    i match {
      case 0 if v.isInstanceOf[Double] => value = v.asInstanceOf[Double]
      case 1 if v.isInstanceOf[Long] => timestamp = v.asInstanceOf[Long]
    }

  }

  override def get(i: Int): AnyRef = {
    i match {
      case 0 => value.asInstanceOf[AnyRef]
      case 1 => timestamp.asInstanceOf[AnyRef]
    }
  }

  override def getSchema: Schema = {
    val schemaString = Source.fromFile("../../FeedServer/res/feedSchema.avsc").mkString

    // Initialize schema
    new Schema.Parser().parse(schemaString)
  }

  /*
  override def put(key: String, v: scala.Any): Unit = {
    key match {
      case "value" => value = v.asInstanceOf[Double]
      case "timestamp" => timestamp = v.asInstanceOf[Long]
    }
  }

  override def get(key: String): AnyRef = {
    key match {
      case "value" => value.asInstanceOf[AnyRef]
      case "timestamp" => timestamp.asInstanceOf[AnyRef]
    }
  }
  */
}


class ExampleJob() {
  def run(t: String, u: String) : Unit = {

    val kafkaParams = Map[String, Object](
      "bootstrap.servers" -> "localhost:9092",
      "key.deserializer" -> classOf[StringDeserializer],
      "value.deserializer" -> classOf[KafkaAvroDeserializer],
      "group.id" -> "use_a_separate_group_id_for_each_stream",
      "auto.offset.reset" -> "latest",
      "schema.registry.url" -> "http://localhost:8081",
      KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG -> "true",
      "enable.auto.commit" -> (false: java.lang.Boolean)
    )

    val topics = Array[String]("feedone")


    var conf = new SparkConf().setMaster("local[2]").setAppName("NetworkWordCount")
    var sc = new StreamingContext(conf, Seconds(2))
    val stream = KafkaUtils.createDirectStream[String, User](
      sc,
      PreferConsistent,
      Subscribe[String, User](topics, kafkaParams)
    )


    val props = new Properties()
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    props.put("client.id", "Producer")
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, classOf[KafkaAvroSerializer])
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[KafkaAvroSerializer])
    props.put("schema.registry.url", "http://localhost:8081")

    val producer = new KafkaProducer[Integer, GenericData.Record](props)



    var serializableStream = stream.map(record => (record.key(), record.value()))


    // WINDOWED
    var windowStream = serializableStream.window(Seconds(4), Seconds(2))



    windowStream.foreachRDD(rdd => {
      var collected = rdd.collect()


      class myanon(timestamp: Long, value: Double) {

        override def toString: String = {
          timestamp.toString + ":>>: " + value.toString
        }
      }

      var sum: Double = 0
      var lastTimestamp: Long = 0
      for(c <- collected){

        println(c._2.get(0))
        println(c._2.get(1))


        var obj: JSONObject = new JSONObject(c._2)

        sum += c._2.get(0).asInstanceOf[Double]
        if (c._2.get(1).asInstanceOf[Long] > lastTimestamp) {
          lastTimestamp = c._2.get(1).asInstanceOf[Long]
        }

      }

      // Write back to Kafka :D - Nearly there!
      //var outputObj: JSONObject = new JSONObject()
      //outputObj.append("timestamp", lastTimestamp.toString)
      //outputObj.append("value", (if (rdd.count() != 0) sum / rdd.count else 0).toString )

      // Not correct
      // var msg: String = outputObj.toString()
      var msg = "{\"timestamp\": %s, \"value\": %s}" format (lastTimestamp.toString, (if (rdd.count() != 0) sum / rdd.count else 0).toString)

      //val record = new ProducerRecord[Integer, Array[Byte]]("spark-output-topic", msg)
      //producer.send(record)

      //////////////////

      //Read avro schema file
      val schema: Schema = new Schema.Parser().parse(Source.fromURL(getClass.getResource("/SparkSchema.avsc")).mkString)

      // Create avro generic record object
      val msgRecord: GenericData.Record = new GenericData.Record(schema)

      //Put data in that generic record
      msgRecord.put("value", (if (rdd.count() != 0) sum / rdd.count else 0))
      msgRecord.put("timestamp", lastTimestamp)


      val queueMessage = new ProducerRecord("spark-output-topic-avro", 0.asInstanceOf[Integer], msgRecord)
      producer.send(queueMessage)

    })



    sc.start()
    sc.awaitTermination()
  }


    /*incomingMessages = message.map(lambda x: mapFunc(x[1]))

    sum = 0
    lastTimestamp = time.time() * 1000
    for inMessage in incomingMessages.collect():
      sum += inMessage['value']
    lastTimestamp = inMessage['timestamp']

    count = incomingMessages.count()

    msg = json.dumps({
      "timestamp": lastTimestamp,
      "value": sum / count
    })
    producer.send(writeTopic, str.encode('{}'.format(msg)))
    producer.flush()*/

}

object Main {
  def main(args: Array[String]) {
    val transactionsIn = "transactions.txt" //args(1)
    val usersIn = "users.txt" //args(0)

    val job = new ExampleJob()
    val results = job.run(transactionsIn, usersIn)
    val output = "output.text" //args(2)
    //results.saveAsTextFile(output)
  }
}


/*

import sys

import time
from pyspark import SparkContext
from pyspark.streaming import StreamingContext
from pyspark.streaming.kafka import KafkaUtils

from kafka import KafkaProducer

import json

broker = "localhost:9092"
readTopic = "test"
readTopicPi = "raspberryPiStream"

writeTopic = "spark-output-topic"

producer = KafkaProducer(bootstrap_servers="localhost:9092")

def quantize(val):
    if val > 0.5:
        return 1
    elif val > 0:
        return 0.5
    elif val > -0.5:
        return 0
    elif val > -1:
        return -0.5
    else:
        return -1

def mapFunc(x):
    obj = json.loads(x)
    #obj['value'] = quantize(obj['value'])

    #if obj['value'] > 0:
    #    obj['alertValue'] = quantize(obj['value'])

    return obj

def handler(message):

    incomingMessages = message.map(lambda x: mapFunc(x[1]))

    # Send All Messages
    sum = 0
    lastTimestamp = time.time() * 1000
    for inMessage in incomingMessages.collect():
        sum += inMessage['value']
        lastTimestamp = inMessage['timestamp']
    #    msg = json.dumps(inMessage)
    #    producer.send(writeTopic, str.encode('{}'.format(msg)))
    #    producer.flush()

    # Send Stat!
    #sum = incomingMessages.reduce(lambda a, b: a['value'] + b['value'])
    count = incomingMessages.count()

    msg = json.dumps({
        "timestamp": lastTimestamp,
        "value": sum / count
    })
    #producer.send(writeTopic, str.encode('{}'.format(msg)))
    #producer.flush()


def windowReduceFunc(a, b):
    if isinstance(a, tuple):
        aa = mapFunc(a[1])['value']
    else:
        aa = a


    if isinstance(b, tuple):
        bb = mapFunc(b[1])['value']
    else:
        bb = b


    return aa + bb


def windowHandler(rdd):
    msg = json.dumps({
        "timestamp": int(round(time.time() * 1000)),
        "value": rdd.collect()[0]
    })
    producer.send(writeTopic, str.encode('{}'.format(msg)))
    producer.flush()

def joinHandler(rdd):
    for item in rdd.collect():
        itemA = json.loads(item[1][0])
        itemB = json.loads(item[1][1])

        msg = json.dumps({
            "timestamp": int(round(time.time() * 1000)),
            "value": itemA["value"] + itemB["value"]
        })
        producer.send(writeTopic, str.encode('{}'.format(msg)))
        producer.flush()

if __name__ == "__main__":


    sc = SparkContext(appName="PythonStreamingKafka")


    ssc = StreamingContext(sc, 2)

    kvs = KafkaUtils.createDirectStream(ssc, [readTopic],{"metadata.broker.list": broker})
    piStream = KafkaUtils.createDirectStream(ssc, [readTopicPi],{"metadata.broker.list": broker})

    # Process Stuff Here
  kvs = KafkaUtils.createDirectStream(ssc, [readTopic],{"metadata.broker.list": broker})
    windowStream = kvs.window(4, 2)
    windowStream.foreachRDD(handler)

    PiWindowStream = piStream.window(4, 2)
    PiWindowStream.foreachRDD(handler)

    windowStream.join(PiWindowStream).foreachRDD(joinHandler)


    #windowStream = kvs.reduceByWindow(windowReduceFunc, None, 4, 2)
    #windowStream.foreachRDD(windowHandler)

    ssc.start()
    ssc.awaitTermination()

 */
