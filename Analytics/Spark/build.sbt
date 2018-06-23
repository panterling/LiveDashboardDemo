name := "Scala"

version := "0.1"

scalaVersion := "2.11.11" //.6

resolvers ++= Seq(
  "confluent" at "http://packages.confluent.io/maven/",
  Resolver.mavenLocal //so we can use local build of kafka-avro-serializer
)

libraryDependencies += "io.confluent" % "kafka-avro-serializer" % "3.3.1" exclude("com.fasterxml.jackson.core", "jackson-databind")



libraryDependencies += "org.apache.spark" % "spark-streaming_2.11" % "2.3.0"
libraryDependencies += "org.apache.spark" %% "spark-streaming-kafka-0-10" % "2.3.0"
libraryDependencies += "org.json" % "json" % "20180130"




libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor" % "2.5.11",
  "com.typesafe.akka" %% "akka-remote" % "2.5.11",
  "com.typesafe.akka" %% "akka-http" % "10.0.11"
)

libraryDependencies += "org.postgresql" % "postgresql" % "9.4-1200-jdbc41"