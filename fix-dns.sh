#!/bin/bash

echo "Fixing DNS for itineraries.symphony-os.com..."

# Check if the entry already exists
if grep -q "itineraries.symphony-os.com" /etc/hosts; then
    echo "Entry already exists in /etc/hosts"
else
    echo "Adding itineraries.symphony-os.com to /etc/hosts..."
    echo "You'll need to enter your password:"
    echo "104.18.3.180  itineraries.symphony-os.com" | sudo tee -a /etc/hosts
fi

# Flush DNS cache
echo "Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo "DNS fix complete! Try refreshing your browser."