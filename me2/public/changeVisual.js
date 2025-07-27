const textToSend = "hello there! this is post from api node.js programming";
console.log('send')
fetch('https://api-twitter-7.onrender.com/send-text', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: textToSend })
})
    .then(response => response.json())
    .then(data => {
        alert(data.redirectUrl)

        window.location.href = data.redirectUrl;  // מפנה את המשתמש ל־Twitter


    });//https://api-twitter-7.onrender.com
