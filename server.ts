const cluster = require("cluster");
const http = require("http");
const { Server } = require("socket.io");
const numCPUs = Math.min(require("os").cpus().length, 3)
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");

if (cluster.isPrimary) {
    console.log(`Master ${process.pid} is running`);
    const httpServer = http.createServer();
    setupMaster(httpServer, {
        loadBalancingMethod: "least-connection",
    });
    setupPrimary();
    cluster.setupPrimary({
        serialization: "advanced",
    });
    httpServer.listen(3000);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker: any) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    console.log(`Worker ${process.pid} started`);

    const room: string = "war-room"
    const io: any = new Server(http.createServer());
    // use the cluster adapter
    io.adapter(createAdapter());

    // setup connection with the primary process
    setupWorker(io);

    io.on("connection", (socket: any) => {
        const clientlist: any = io.sockets.adapter.rooms.get(room)
        if (clientlist && clientlist.has(socket.id)) {
            socket.leave(room)
        }
        socket.join(room)
        io.to(socket.id).emit("welcome", `   Welcome ( ${socket.id} ) from master`);
        socket.on(`disconnect`, () => {
            if (clientlist && clientlist.has(socket.id)) {
                socket.leave(room)
            }
        })
        socket.on('greetings', console.log)
    });
}
