import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectQueue = async () => {
    try {
        // 'rabbitmq' is the service name from docker-compose
        const connection = await amqp.connect('amqp://rabbitmq:5672');
        channel = await connection.createChannel();
        await channel.assertQueue('AUDIT_LOGS', { durable: true });
        console.log('🐇 RabbitMQ Connected Successfully');
    } catch (err) {
        console.error('RabbitMQ Connection Error:', err);
    }
};

export const publishToQueue = (data: any) => {
    if (channel) {
        channel.sendToQueue('AUDIT_LOGS', Buffer.from(JSON.stringify(data)));
    }
};