import http from 'http'
import ws from 'ws'
import app from './app'
import { normalizePort } from './utils'

const debug = require('debug')('myapp:main')

const port = normalizePort(process.env.PORT || '3000')
const server = http.createServer(app)

app.set('port', port)

server.listen(port)

server.on('error', (error: any) => {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  switch (error.code) {
    case 'EACCES':
      debug(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      debug(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
})

server.on('listening', () => {
  debug(`server running on http://localhost:${port}`)
})

// ws
const wsServer = new ws.Server({
  path: '/',
  noServer: false,
  port: 9999,
})

const broadcast = data => {
  const results = []
  for (let client of Array.from(wsServer.clients)) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data))
    }
  }
  return results
}

const broadcastTotal = () => {
  const total = wsServer.clients.size
  debug(`${total} client(s) connected`)
  broadcast({
    type: 'update_count',
    total,
  })
}

wsServer.on('connection', (socket, request) => {
  broadcastTotal()
  socket.on('close', () => {
    broadcastTotal()
  })
})
