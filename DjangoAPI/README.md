# Build 
docker build -t soilapp_image .


# Run
docker run -d -v /webroot:/var/www/html -p 80:80 --name soilapp soilapp_image