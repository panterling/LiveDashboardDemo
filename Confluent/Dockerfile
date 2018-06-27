FROM ubuntu:16.04

RUN apt-get update \
    && apt-get install -y wget software-properties-common curl jq

RUN add-apt-repository ppa:webupd8team/java
RUN apt-get update
RUN apt-get install -y openjdk-8-jdk

RUN wget http://packages.confluent.io/archive/4.1/confluent-oss-4.1.1-2.11.tar.gz

RUN tar -xvf confluent-oss-4.1.1-2.11.tar.gz

RUN mv confluent-4.1.1 confluent

ADD sink-soilapp.properties .
ADD server.properties confluent/etc/kafka/


CMD ["/bin/bash", "-c", "confluent/bin/confluent start && confluent/bin/confluent load sink-soilapp -d sink-soilapp.properties && trap : TERM INT; sleep infinity & wait"]
