import cluster from "cluster"
if (cluster.isPrimary) {
    const cpu = Math.min(3, require("os").cpus().length);
    const room: string = "war-room"
    cluster.setupPrimary({
        serialization: "advanced",
    });
    const clusterFork = (workerId: string) => {
        const worker = cluster.fork();
        worker.on('message', console.log)
        worker.on('exit', () => clusterFork(workerId))
        worker.send({
            room,
            workerId
        })
    }
    for (let i = 0; i < cpu; i++) {
        clusterFork(`worker-${i}`)
    }
    console.log(`Master ${process.pid} is running`);
} else {
    process.on("message", async (data: any) => {
        const { io } = require('socket.io-client')
        const { room, workerId } = data
        const sio = io('http://localhost:3000', {
            withCredentials: true
        })
        sio.on('welcome', console.log)
        sio.on('connect', async () => {
            sio.on(room, console.log)
            sio.emit('greetings', `     Greetings from ${workerId} ( ${sio.id} )`)
        })
        sio.on('disconnect', () =>
            sio.emit(`disconnect`, workerId)
        )
    })

}
