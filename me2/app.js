// app.js

const express = require('express');
const app = express();
const PORT = 3000;
const querystring = require('querystring');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
let rv1 = ''
let token_Secret = ''


const { text } = require('stream/consumers');
const { stat } = require('fs');
// app.use(express.static('public')); // כאן נשמור את הקבצים ללקוח
const { Server } = require('socket.io');
let oauth = null;


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post('/send-text', (req, res) => {
    const receivedText = req.body.text;   // פה אנחנו לוקחים את הטקסט מהגוף של הבקשה
    console.log('קיבלנו טקסט:', receivedText);
    rv1 = receivedText;

    // הגדר את המפתחות שלך
    const consumerKey = 'REie9oBKESnUqDmX1jv5TAUe1';
    const consumerSecret = '1IntNv62Knrt3yAv4RLWCEMszLAJmz784tjsBTLwwBGDwEkSsq';

    oauth = OAuth({
        consumer: { key: consumerKey, secret: consumerSecret },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        },
    });


    const request_data = {
        url: 'https://api.twitter.com/oauth/request_token',
        method: 'POST',
        data: {
            oauth_callback: 'https://t-2-fs03.onrender.com/twitter/callback'  // כי האפליקציה Desktop
        }
    };


    const headers = oauth.toHeader(oauth.authorize(request_data));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';


    console.log('send to authentication...')


    axios.post(request_data.url, null, { headers }).then(response => {
        console.log('request_token response:', response.data);
        const responseParams = querystring.parse(response.data);

        const oauth_token = responseParams.oauth_token;
        const oauth_token_secret = responseParams.oauth_token_secret;
        console.log(oauth_token)
        console.log(oauth_token_secret)
        token_Secret = oauth_token_secret;

        console.log('wait to callback....')
        res.json({ redirectUrl: `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}` });

    })
        .catch(error => {
            console.error('שגיאה בקבלת request_token:', error.response?.data || error.message);
        });// מדפיסים למסוף של השרת את הטקסט שהתקבל

});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'page1.html'))
});


function accessToken(oauth_token, secret, oauth_verifier, res) {
    console.log('in callback...')
    const accessTokenRequestData = {
        url: 'https://api.twitter.com/oauth/access_token',
        method: 'POST',
        data: {
            oauth_verifier
        }
    };

    const consumerKey = 'REie9oBKESnUqDmX1jv5TAUe1';
    const consumerSecret = '1IntNv62Knrt3yAv4RLWCEMszLAJmz784tjsBTLwwBGDwEkSsq';

    oauth = OAuth({
        consumer: { key: consumerKey, secret: consumerSecret },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        },
    });



    const token = { key: oauth_token, secret: secret }; // חשוב! לשמור את הסוד לפי token

    const headers = oauth.toHeader(oauth.authorize(accessTokenRequestData, token));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    axios.post(accessTokenRequestData.url, null, { headers })
        .then(response => {
            const responseParams = querystring.parse(response.data);
            const accessToken = responseParams.oauth_token;
            const accessTokenSecret = responseParams.oauth_token_secret;

            console.log('Access Token:', accessToken);
            console.log('send post...');

            // עכשיו אפשר לצייץ
            tweetToTwitter(rv1, accessToken, accessTokenSecret, res);

        })
        .catch(error => {
            console.error('שגיאה בקבלת access_token:', error.response?.data || error.message);
            res.status(500).send('שגיאה בקבלת access_token');
        });
}


app.get('/twitter/callback', (req, res) => {
    const { oauth_token, oauth_verifier } = req.query;
    accessToken(oauth_token, token_Secret, oauth_verifier, res)
    console.log('post sended')
});

app.listen(PORT, () => {
    console.log(`השרת פועל בכתובת http://localhost:3000`);
});




function tweetToTwitter(statusText, oath_token, oauth_token_secret, res) {


    const request_data = {
        url: 'https://api.twitter.com/1.1/statuses/update.json',
        method: 'POST',
        data: { status: statusText }
    };

    const token = {
        key: oath_token,
        secret: oauth_token_secret,
    };
    oauth = OAuth({
        consumer: { key: consumerKey, secret: consumerSecret },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        },
    });
    const headers = oauth.toHeader(oauth.authorize(request_data, token));
    headers["Content-Type"] = "application/x-www-form-urlencoded";

    // גוף הבקשה
    const body = querystring.stringify({ status: statusText });

    fetch(request_data.url, {
        method: 'POST',
        headers: headers,
        body: body
    })
        .then(res => {
            if (!res.ok) throw new Error(`Tweet failed: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("✅ ציוץ נשלח בהצלחה:", data);
        })
        .catch(err => {
            console.error("❌ שגיאה בשליחת ציוץ:", err);
        });


}
