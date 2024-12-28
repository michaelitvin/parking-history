#!/bin/bash

# Create a clean deployment directory
rm -rf package
mkdir -p package

# Install dependencies into the package directory
pip install --target ./package -r requirements.txt

# Copy our Lambda function into the package directory
cp query_parking.py package/

# Create the deployment package from the package directory
cd package
rm -f function_query_parking.zip
zip -r ../function_query_parking.zip .
cd ..

echo "Deployment package created as function_query_parking.zip"
