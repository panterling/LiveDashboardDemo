FROM ubuntu:16.04

RUN apt-get update \
    && apt-get install -y cron python3 python3-pip
 
# Add crontab file in the cron directory
ADD crontab /etc/cron.d/soil-cronjobs

ADD dailyUpdater.py .
ADD requirements.txt .
 
RUN pip3 install -r requirements.txt

# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/soil-cronjobs
 
# Create the log file to be able to run tail
RUN touch /var/log/cron.log
 
# Run the command on container startup
CMD ["/bin/bash", "-c", "cron && tail -f /var/log/cron.log"]
