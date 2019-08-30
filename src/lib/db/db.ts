import { MongoClient } from 'mongodb'
import { metadataStorage, BaseModel } from './model'
import { ObjectType } from './types'

const debug = require('debug')('myapp:lib:db')

const DB_URI = process.env.DB_URI
const DB_NAME = process.env.DB_NAME

const connectDB = (() => {
  const connected = {}
  return (dbUri = DB_URI): Promise<MongoClient> => {
    if (connected[dbUri]) {
      return Promise.resolve(connected[dbUri])
    }
    const client = new MongoClient(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })

    client.on('close', () => {
      connected[dbUri] = undefined
      debug(`closed connection to ${dbUri}`)
    })

    return new Promise((resolve, reject) => {
      client.connect(err => {
        connected[dbUri] = client
        if (err) {
          return reject(err)
        }
        debug(`connected to ${dbUri}`)
        resolve(client)
      })
    })
  }
})()

export class DB {
  client: MongoClient
  readonly database: string
  readonly dbURI: string

  constructor(config: { dbURI: string; database: string }) {
    this.client = null
    this.database = config.database
    this.dbURI = config.dbURI
  }

  connect() {
    return connectDB(this.dbURI).then(client => (this.client = client))
  }

  get current() {
    if (!this.client) {
      throw new Error(`db not connected`)
    }
    return this.client.db(this.database)
  }

  getCollection<T extends BaseModel>(modelClass: ObjectType<T>) {
    const match = metadataStorage.getMetadataByClass(modelClass)
    if (!match) {
      throw new Error(`${modelClass.name} cannot be resolved`)
    }
    return this.current.collection<T>(match.name as string)
  }
}

export const db = new DB({
  database: DB_NAME,
  dbURI: DB_URI,
})
