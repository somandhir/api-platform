import amqp from 'amqplib';

const startConsumer = async () => {
    try {
        const connection = await amqp.connect('amqp://rabbitmq:5672');
        const channel = await connection.createChannel();

        await channel.assertQueue('AUDIT_LOGS', { durable: true });
        channel.prefetch(1);


        console.log('Audit Service is waiting for messages...');

        channel.consume('AUDIT_LOGS', (msg) => {
            if (msg !== null) {
                try {
                    const log = JSON.parse(msg.content.toString());
                    console.log('[AUDIT LOG STORED]:', log);
                    channel.ack(msg);
                } catch (err) {
                    console.error('Failed to process message:', err);
                    channel.nack(msg, false, false);

                }
            }
        });
    } catch (err) {
        console.error('Audit Service MQ Error:', err);
        setTimeout(startConsumer, 5000); // Retry after 5s
    }
};

startConsumer();