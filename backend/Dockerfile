# Base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Expose the Flask port
EXPOSE 5000


# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["bash", "-c", "python -c 'from app import run_download_script; run_download_script()' && flask run --host=0.0.0.0"]

# Command to run the Flask app
# CMD ["flask", "run"]
