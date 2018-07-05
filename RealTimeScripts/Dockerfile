FROM ubuntu:16.04

RUN apt-get update \
    && apt-get install -y python3 python3-pip
 

ADD realtimeScraper.py .
ADD requirements.txt .
ADD config.yml .
 
RUN pip3 install -r requirements.txt


CMD ["python3", "realtimeScraper.py"]
