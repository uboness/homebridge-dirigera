<p align="center">

</p>

<span align="center">

# Homebridge Plugin for IKEA DIRIGERA Hub

</span>

Currently supports the following device types:

- `light`
- `blinds`

### Settings

Multiple hubs can be configured, where each hub entry has the following settings:

- `host` (required) - specifies the host/IP of the DIRIGERA hub on your local network
- `token` (optional, yet highly recommended) - specifies the authentication token to the hub. If not 
   specified, the startup will be halted until you press on the pairing button of the hub. Then the 
   authentication token will be resolved and printed in the logs - it is reommended to copy this token and store it in 
   the settings, to avoid the creation of multiple tokens. Also, this way Homebridge won't halt during restart. 
- `name` (optional) - will be set as the name of the hub (in the logs). When not set, the name is resolved from
  the hub itself.

A typical record in the Homebridge `config` should look like this:

```json
{
  "hubs": [
    {
      "host": "<ip>",
      "token": "<auth_token>",
      "name": "Living Room"
    },
  ],
  "platform": "Dirigera"
}
```