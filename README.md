# genius-pay-sdk

Official SDK for ethpar services.

## Overview
This repository provides SDK that exposes API to connect to the ethpar backend.

## Installation

### react-native
```sh
npm install genius-pay-sdk react-native-device-info
```

### web (react)
```sh
npm install genius-pay-sdk
```

## Usage
```
import { MerapiClient } from 'genius-pay-sdk'

const API_URL = 'https://api.dev.rampatm.net/ramp'
const CLIENT_ID = '<your_client_id>'
const DEVICE_ID = '<your_device_id>'

const client = new MerapiClient({
  baseUrl: API_URL,
  clientId: CLIENT_ID,
  deviceId: DEVICE_ID
})

// provide a token to authenticate subsequent requests
client.setAuthTokenProvider(async () => '<your_session_token>')

// example read call
const user = await client.getCurrentUser()
```

## License
Apache 2.0
