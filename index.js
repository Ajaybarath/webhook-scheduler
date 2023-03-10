const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const schedule = require('node-schedule');

app.use(express.json());
app.use(bodyParser.json());

const PORT = 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

const customers = new Map();
const ordersPlaced = [];


app.post('/webhooks/checkout_abandoned', (req, res) => {

    const payload = req.body;
    const customerId = payload.customer.id;

    const customerData = {
      checkoutId: payload.id,
      job1: null,
      job2: null,
      job3: null,
      orderStatus: false,
    };
    customers.set(customerId, customerData);

    const abandonedCheckoutDate = new Date(payload.updated_at);

    const firstMessageDate = new Date(abandonedCheckoutDate.getTime() + 30 * 60000);
    const secondMessageDate = new Date(abandonedCheckoutDate.getTime() + 86400000);
    const thirdMessageDate = new Date(abandonedCheckoutDate.getTime() + 259200000);

    scheduleMessage(payload.customer.id, payload.customer.email, firstMessageDate, secondMessageDate, thirdMessageDate, payload);

    res.status(200).send('OK');
});


app.post('/webhooks/order_placed', (req, res) => {

    const payload = req.body;
    const customerId = payload.order.customer.id;

    if (customers.has(customerId)) {
        cancelScheduledMessages(customerId);
        res.status(200).send('OK');
    } else {
        res.status(404).send('Customer id not found');
    }

});

app.get('/webhooks/order_list', (req, res) => {

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(JSON.stringify([...ordersPlaced]));

});

function cancelScheduledMessages(customerId) {

    const customerData = customers.get(customerId);
    
    if (customerData.job1) {
    customerData.job1.cancel();
    }
    if (customerData.job2) {
    customerData.job2.cancel();
    }
    if (customerData.job3) {
    customerData.job3.cancel();
    }

    if (customerData.orderStatus === false) {
        const orderData = {
            customerId: customerId,
            checkoutId: customerData.checkoutId,
            orderStatus: 'order_placed',
        };
        ordersPlaced.push(orderData);
        customerData.orderStatus = true;
    } 

}

function scheduleMessage(customerId, email, firstMessageDate, secondMessageDate, thirdMessageDate, payload) {

    const customerData = customers.get(customerId);

    customerData.job1 = schedule.scheduleJob(firstMessageDate, () => {
        sendEmail(email, payload);
    });

    customerData.job2 = schedule.scheduleJob(secondMessageDate, () => {
        sendEmail(email, payload);
    });

    customerData.job3 = schedule.scheduleJob(thirdMessageDate, () => {
        sendEmail(email, payload);
    });
}

function sendEmail(toEmailId, payload) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: 'eajaybarath@gmail.com',
          pass: 'bjwgeituqtqfwazu'
        }
    });



    var mailOptions = {
        from: 'eajaybarath@gmail.com',
        to: toEmailId,
        subject: 'Hey, you forgot to checkout your products',
        text: "Product details and the message",
      };


    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
      });
}