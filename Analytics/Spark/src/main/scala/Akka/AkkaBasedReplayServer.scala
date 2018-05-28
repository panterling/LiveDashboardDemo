package Akka


import java.time.LocalDateTime

import java.sql.{DriverManager, SQLException}

import akka.{Done, NotUsed}
import akka.actor.{Actor, ActorContext, ActorRef, ActorSystem, PoisonPill, Props}
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.ws.{TextMessage, _}
import akka.http.scaladsl.server.Directives._
import akka.stream._
import akka.stream.scaladsl._
import akka.util.Timeout
import akka.pattern.ask

import scala.collection.mutable.Queue
import scala.collection.mutable.ListBuffer
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Await, Future}
import scala.concurrent.duration._
import scala.io.StdIn



sealed case class FeedServeParameters() {
  // FEED SERVER PARAMETERS
  val SendRate = 0.1
  val QueryFetchRate = 1
  val QueryFetchSize = (QueryFetchRate / SendRate).toInt
}

sealed case class FeedMessage(timestamp: LocalDateTime, value: Any) {
  override def toString: String = "[" + timestamp + "] " + value
}

sealed case class BufferMessages(msgs: ListBuffer[FeedMessage])
sealed case class SendPacket()
sealed case class PurgeQueue()
sealed case class SetClient(client: ActorRef)

sealed abstract class FeedManagerActorCommand()
sealed case class RewindTo(t: LocalDateTime) extends FeedManagerActorCommand
sealed case class Kill() extends FeedManagerActorCommand


object WebSocket {
  case class Connected(outgoing: ActorRef)
  case class Disconnected(outgoing: ActorRef)

  case class IncomingMessage(text: String)
  case class OutgoingMessage(text: String)
}

class WebSocketManagerActor extends Actor {

  var feedProxy: FeedProxy = null

  override def postStop(): Unit = {
    println("WebSocketManagerActor::postStop()")
    super.postStop()
  }

  def connected(outgoing: ActorRef): Receive = {
    println("Connected")

    {
      case WebSocket.IncomingMessage(text) => {
        println("                                           RX:: " + text)
        feedProxy.rewindTo(LocalDateTime.of(2018, 1, 1, 0, 0, 0))
      }

      case WebSocket.OutgoingMessage(msg) => {
        println("                                           TX:: " + msg)
        outgoing ! WebSocket.OutgoingMessage(msg)
      }

      case WebSocket.Disconnected => {
        println("WebSocketManagerActor:: I'm an un-used death method...")
      }

      case _ => {
        outgoing ! WebSocket.OutgoingMessage("????")
      }

    }
  }

  var nextFeedIndex = 0
  def addFeed(startDateTime: LocalDateTime): FeedProxy = {
    nextFeedIndex += 1

    // Should probably pass the context and make the FeedManagers be children of this actor....
    new FeedProxy(context, "feed" + nextFeedIndex.toString, startDateTime)
  }


  def receive = {

    case WebSocket.Connected(outgoing) => {
      feedProxy = addFeed(LocalDateTime.of(2018, 1, 1, 0, 0, 0))

      feedProxy.getFeedManagerActor() ! SetClient(self)

      context.become(connected(outgoing)) // What does this do?
    }
  }
}


class FeedManagerActor(feedName: String, startDateTime: LocalDateTime, feedServeParameters: FeedServeParameters = FeedServeParameters()) extends Actor {

  // STATE
  var lastDateTime = startDateTime

  // DATABASE STUFF
  val conn = DriverManager.getConnection("jdbc:postgresql://localhost/cosmo-local", "chris", "???")

  // AKKA
  val feed: ActorRef = context.actorOf(Props(new FeedSenderActor(feedName)), feedName)

  val sendPacketSchedule = context.system.scheduler.schedule(0 milliseconds, (feedServeParameters.SendRate seconds).toMillis milliseconds, feed, SendPacket)
  val queryFetchSchedule = context.system.scheduler.schedule(0 milliseconds, (feedServeParameters.QueryFetchRate seconds).toMillis milliseconds) {

    feed ! nextMessageBuffer(feedServeParameters.QueryFetchSize)
  }

  // METHODS

  override def postStop() = {
    println("FeedManagerActor::postStop()")
    kill()
    super.postStop()
  }
  private def nextMessageBuffer(n: Int): BufferMessages = {


    var ret = ListBuffer[FeedMessage]()

    var queryString = """
            SELECT
            	time,
            	value
            FROM
            	dummyTimeSeriesData
            WHERE
            	time BETWEEN '%s'::timestamp AND '%s'::timestamp
          """. format (lastDateTime.toString, (lastDateTime plusSeconds n).toString)

    try {
      val start = System.currentTimeMillis
      val resultSet = conn.createStatement.executeQuery(queryString)

      while (resultSet.next) {
        ret += FeedMessage((resultSet getTimestamp 1).toLocalDateTime, resultSet getInt 2)
      }
      println("Query Time [%s]" format (System.currentTimeMillis() - start))

      lastDateTime = lastDateTime plusSeconds (n + 1)
    } catch {
      case ex: SQLException =>
        System.out.println(ex.getMessage)
    }

    BufferMessages(ret)
  }

  def rewindTo(t: LocalDateTime): Unit = {
    feed ! PurgeQueue
    lastDateTime = t
  }

  def kill(): Unit = {
    println("FeedManagerActor cancelling schedules")
    sendPacketSchedule.cancel()
    queryFetchSchedule.cancel()
  }



  def receive = {
    case RewindTo(t) => rewindTo(t)
    case Kill() => {
      kill()

      implicit val timeout = Timeout(2 seconds)
      feed ? PurgeQueue onComplete {
        case util.Success(result) => {
          println("FeedManagerActor:: kill() Done")
          context.stop(feed)
          println(sender.path)
          sender ! "Success"
        }

        case util.Failure(ex) =>
          println(s"FAIL: ${ex.getMessage}")
          ex.printStackTrace()
          sender ! "End"
      }
    }
    case SetClient(c) => feed ! SetClient(c)
    case a => println(this.getClass.getSimpleName + ":: " + "Unknown Message::" + a.getClass)
  }
}

class FeedSenderActor(feedName: String) extends Actor {

  var msgQueue: Queue[FeedMessage] = new Queue[FeedMessage]

  var client: ActorRef = null;


  override def postStop() = {
    println("FeedSenderActor::postStop()")
    msgQueue.clear();
    super.postStop()
  }

  def receive = {
    case BufferMessages(msgs) => msgQueue ++= msgs
    case SendPacket => {
      if(msgQueue.nonEmpty) {
        var msg = msgQueue.dequeue
        if(client != null) {
          client ! WebSocket.OutgoingMessage(msg.toString)
        }
        println("[%s][%s remaining] Sending Packet: %s ".format(feedName, msgQueue.size, msg))
      } else {
        println("Empty Queue")
      }
    }
    case PurgeQueue => msgQueue.clear(); sender ! ""
    case SetClient(c) => {
      client = c
    }
    case _ => println(this.getClass.getSimpleName + ":: " + "Unknown Message?")
  }
}



class FeedProxy(context: ActorContext, feedName: String, startDateTime: LocalDateTime = LocalDateTime.now()) {


  val feedManager: ActorRef = context.actorOf(Props(new FeedManagerActor(feedName, startDateTime)), feedName)
  def getFeedManagerActor() = feedManager

  var isAlive = true

  def lifeCheck(f: FeedManagerActorCommand): Unit = {
    if (isAlive) {
      feedManager ! f
    } else {
      throw new Exception("This is a dead Feed. Nothing can be done with it.")
    }
  }

  def rewindTo(t: LocalDateTime): Unit = lifeCheck(RewindTo(t))
  def kill(): Unit = {
    isAlive = false
    implicit val timeout = Timeout(4 seconds)
    // CP: Error: Timing Out
    feedManager ? Kill() onComplete {
      case msg => {
        println("Feed Dead")
      }
    }
  }
}

object Akka {
  def main(args: Array[String]): Unit = {

    // AKKA
    implicit val system = ActorSystem("MyAkkaSystem")

    /*
       /////// MAIN //////
      addFeed(LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0))
      addFeed(LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0))
      addFeed(LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0))
      addFeed(LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0))

      var feedObj = addFeed(LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0))

      system.scheduler.scheduleOnce(2000 milliseconds) {
        println("Restarting Feed to Midnight....")

        feedObj rewindTo LocalDateTime.of(2018, Month.JANUARY, 1, 0, 0, 0)

        system.scheduler.scheduleOnce(2000 milliseconds) {
          println("KILLING Feed ....")
          feedObj.kill()

          try {
            feedObj rewindTo LocalDateTime.now()
          } catch {
            case e : Throwable => println("feedObj Exception")
          }
        }
      }
      */


    implicit val materializer = ActorMaterializer()

    def myCustomWebSocketHandler(): Flow[Message, Message, NotUsed] = {
      val connectionActor = system.actorOf(Props(new WebSocketManagerActor))

      val incomingMessages: Sink[Message, _] =
        Flow[Message].map {
          // transform websocket message to domain message
          case TextMessage.Strict(text) => WebSocket.IncomingMessage(text)
        }
          .to(Sink.actorRef[WebSocket.IncomingMessage](connectionActor, PoisonPill))

      val outgoingMessages: Source[Message, _] =
        Source.actorRef[WebSocket.OutgoingMessage](10, OverflowStrategy.fail)
          .mapMaterializedValue { outActor =>
            // give the user actor a way to send messages out
            connectionActor ! WebSocket.Connected(outActor)
            NotUsed
          }
          .map(
            // transform domain message to web socket message
            (outMsg: WebSocket.OutgoingMessage) => {
              TextMessage(outMsg.text)
            }
          )
          /*
          // Cannot guarantee processing of messages before the actor has been stopped!
          .watchTermination()((_, f: Future[Done]) => {
              f onComplete {
                case msg => {
                  implicit val timeout = Timeout(5 seconds)
                  connectionActor ! WebSocket.Disconnected
                }
              }
            }
          )*/

      // then combine both to a flow
      Flow.fromSinkAndSourceCoupled(incomingMessages, outgoingMessages)
    }






    val route =
      path("") {
        get {
          handleWebSocketMessages(myCustomWebSocketHandler())
        }
      }

    val binding = Await.result(Http().bindAndHandle(route, "127.0.0.1", 3001), 3.seconds)


    // the rest of the sample code will go here
    println("Started server at 127.0.0.1:3001, press enter to kill server")
    StdIn.readLine()
    system.terminate()

  }
}
