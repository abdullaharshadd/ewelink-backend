import { client, redirectUrl, randomString } from '../../config/config.js'
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { setData } from '../../data.js';

export const getAccess = async () => {
    const loginUrl = client.oauth.createLoginUrl({
      redirectUrl: redirectUrl,
      grantType: 'authorization_code',
      state: randomString(10),
    });

    const params = new URLSearchParams(loginUrl);

    const nonce = params.get('nonce');
    const seq = params.get('seq');
    const authorization = params.get('authorization').replaceAll(' ', '+');

    const body = {
      password: process.env.EWELINK_PASSWORD,
      clientId: process.env.EWELINK_APPID,
      state: randomString(10),
      redirectUrl: "http://127.0.0.1:8000/redirectUrl",
      grantType: "authorization_code",
      email: process.env.EWELINK_EMAIL,
    };
    
    try {
      const response = await fetch('https://apia.coolkit.cn/v2/user/oauth/code', {
        method: 'POST',
        headers: {
          'X-CK-Appid': process.env.EWELINK_APPID,
          'X-CK-Nonce': nonce,
          'X-CK-Seq': seq,
          'Authorization': `Sign ${authorization}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body), // Convert payload to JSON
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    
      const result = await response.json(); // Parse JSON response
      
      const info = await client.oauth.getToken({
        region: result.data.region,
        redirectUrl,
        code: result.data.code
      });

      client.at = info.data.accessToken;
      client.region = result.data.region;
      client.setUrl(result.data.region);

      //let thingList = await client.device.getAllThingsAllPages({});
      return client;
    } catch (error) {
      console.error('Error:', error.message);
      return null;
    }
    
};

export const changeStatus = async (deviceId, status, client) => {
  try {
    //const client = await getAccess();
    if (client !== null) {
      const result = await client.device.setThingStatus({
        type: "device",
        id: deviceId,
        params: {
          switches: [
            {
              switch : status
            }
          ]
        }
      });
      console.log(result);
      if (result.error) {
        return 'Control failed';
      } else {
        return 'Done';
      }
    } else {
      console.log('Couldnt get access to eWeLink and failed to update data');
    }
  } catch(e){
    console.log('Couldnt set device status: ', e);
  } finally {
    
  }
}

export const fetchAndSaveEnergyConsumptionData = async () => {
  try {
    const client = await getAccess();
    if (client !== null) {
      const result = await client.device.getAllThings();
      setData(result);
    } else {
      console.log('Couldnt get access to eWeLink and failed to update data');
    }
  } catch(e){
    console.log('Couldnt update data: ', e);
  } finally {
    
  }
};