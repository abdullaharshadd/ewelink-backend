import { client, redirectUrl, randomString } from '../../config/config.js'
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { setData, getAccessInfo, setAccessInfo } from '../../data.js';
import db from '../../config/database.js';

const isloginRequired =  async () => {
  const temp = getAccessInfo();
  if (!temp) {
    console.log("Logging in for the first time.");
    return false;
  }
  else if (temp.data.atExpiredTime > Date.now() && temp.data.rtExpiredTime > Date.now()) {
    console.log("Using same access token");
    return temp;
  }
  // Refresh the token
  else if (temp.data.atExpiredTime < Date.now() && temp.data.rtExpiredTime > Date.now()) {
      console.log("Refreshing the access token");
      const tokens = await client.user.refreshToken({ rt: info.data.refreshToken});
      if (tokens.error === 0) {
        temp.data.accessToken = tokens.data.at;
        temp.data.refreshToken = tokens.data.rt;
        setAccessInfo(temp);
        client.at = temp.data.accessToken;
        return temp;
      }
  }
  console.log("logging in again");
  return null;
}

export const getAccess = async () => {
    const temp = await isloginRequired();
    if (temp) {
      return client;
    }

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

      setAccessInfo(info);

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

export const changeStatus = async (deviceId, status, deviceType) => {
  try {
    const client = await getAccess();
    if (client !== null) {
      const result = await client.device.setThingStatus({
        type: "device",
        id: deviceId,
        params: deviceType === 'AC' ? {
          switches: [
            {
              switch : status,
              outlet: 0
            }
          ]
        } : {
          switch: status
        }
      });
      return result;
    } else {
      console.log('Couldnt get access to eWeLink and failed to update data');
      return null;
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

export const closeWindowsConditionally = async () => {
  try {
    const client = await getAccess();
    const result = await client.device.getAllThings();
    const readQuery = `
      SELECT device_id, current_status, device_type, 
      strftime('%Y-%m-%dT%H:%M:%fZ', last_updated_at) AS last_updated_at FROM devices_records;
    `;
    const statement = db.prepare(readQuery); // Prepare the query
    const rows = statement.all();
    
    if (rows.length > 0) {
      const response = {
        AC: rows.filter(record => record.device_type === 'AC'), 
        windows: rows.filter(record => record.device_type === 'Window')
      };
    
      let isAnyWindowOpen = false;
      let has3MinutesPassed = false;
      let latestLastUpdatedTime = null;
      response.windows.forEach((window) => {
        const windowLastUpdatedAt = (new Date(window.last_updated_at).getTime()) / 1000;
        
        if (window.current_status === 'on') {
          isAnyWindowOpen = true;
        }

        if (!latestLastUpdatedTime) {
          latestLastUpdatedTime = windowLastUpdatedAt;
        } else {
          latestLastUpdatedTime = windowLastUpdatedAt > latestLastUpdatedTime ? windowLastUpdatedAt : latestLastUpdatedTime;
        }

      });

      const aclastUpdatedTime = new Date(response.AC[0].last_updated_at).getTime() / 1000;

      if (latestLastUpdatedTime < aclastUpdatedTime) {
        latestLastUpdatedTime = aclastUpdatedTime;
      }

      const rightNow = (new Date(Date.now())).getTime() / 1000;
      if ((rightNow - latestLastUpdatedTime) > 180) {
        has3MinutesPassed = true;
      }
      const isACOn = response.AC[0].current_status === 'on' ? true: false;
    
      if (isAnyWindowOpen && has3MinutesPassed && isACOn) {
        await changeStatus(response.AC[0].device_id, 'off', 'AC');
        console.log('Turned off the AC because one of the windows were open!');
      } else if (!isAnyWindowOpen && has3MinutesPassed && !isACOn) {
        await changeStatus(response.AC[0].device_id, 'on', 'AC');
        console.log('Turned on the AC because none of the windows were open!');
      }

      let windowsIndex = 0;
      for (let a = 0; a < result.data.thingList.length; a++) {
        let updateQuery = '';
        if (result.data.thingList[a].itemData.name.includes("Window")) {
          if (result.data.thingList[a].itemData.params.switch !== response.windows[windowsIndex].current_status) {
            updateQuery = `UPDATE devices_records set current_status = '${result.data.thingList[a].itemData.params.switch}', last_updated_at = CURRENT_TIMESTAMP WHERE device_id = '${result.data.thingList[a].itemData.deviceid}';`;
          }
          windowsIndex++;
        } else { // AC
          if (result.data.thingList[a].itemData.params.switches[0].switch !== response.AC[0].current_status) {
            updateQuery = `UPDATE devices_records set current_status = '${result.data.thingList[a].itemData.params.switches[0].switch}', last_updated_at = CURRENT_TIMESTAMP WHERE device_id = '${result.data.thingList[a].itemData.deviceid}';`;
          }
        }
        
        if (updateQuery.length > 0) {
          db.exec(updateQuery);
        }
      }
    } else {
      let query = `INSERT INTO devices_records (device_id, current_status, device_type) VALUES `;
        result.data.thingList.forEach((device) => {
          if (device.itemData.name.includes('Window')) {
            query += `('${device.itemData.deviceid}', '${device.itemData.params.switch}', '${'Window'}'), `;
          } else {
            query += `('${device.itemData.deviceid}', '${device.itemData.params.switches[0].switch}', '${'AC'}'), `;
          }
        });
      query = query.replace(/,(?=[^,]*$)/, ';');
      db.exec(query); // Prepare the query
    }
  }
  catch(e) {
    console.log(e);
  }
}