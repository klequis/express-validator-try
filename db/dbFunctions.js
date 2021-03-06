import mongodb, { ObjectID } from 'mongodb'
import { removeIdProp } from './helpers'
import config from '../config'
import { yellow } from 'logger'

const MongoClient = mongodb.MongoClient

let client

const connectDB = async () => {
  if (!client) {
    console.log('mongoUri', config.mongoUri)
    client = await MongoClient.connect(config.mongoUri, {
      useNewUrlParser: true
    })
  }
  return { db: client.db(config.dbName) }
}

export const close = async () => {
  if (client) {
    client.close()
  }
  client = undefined
}

const formatReturnSuccess = data => {
  return { data: data, error: null }
}

const formatReturnError = (functionName, error) => {
  logError(functionName, error)
  return { data: null, error: error.message }
}

const logError = (functionName, error) => {
  if (config.env !== 'production') {
    console.error(`Error: dbFunctions.${functionName}`, error.message)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {Array} data  an array of documents, without _id, to be inserted
 *
 * @returns {object} { data: [], error: '' } where data is an array of one or more documents
 */
export const insertMany = async (collection, data) => {
  try {
    const { db } = await connectDB()
    const ret = await db.collection(collection).insertMany(data)
    return formatReturnSuccess(ret.ops)
  } catch (e) {
    return formatReturnError('insertMany', e)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @returns {boolean}
 *
 */
export const dropCollection = async collection => {
  try {
    const { db } = await connectDB()
    const ret = await db.collection(collection).drop()
    return formatReturnSuccess(ret)
  } catch (e) {
    if ((e.message = 'ns not found')) {
      return formatReturnSuccess(true)
    } else {
      return formatReturnError('insertMany', e)
    }
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {object} data a documnet, without _id, to be inserted
 * @returns {object} { data: [], error: '' } where data is always an array of 1
 *
 */
export const insertOne = async (collection, data) => {
  yellow('collection', collection)
  yellow('data', data)
  try {
    const { db } = await connectDB()
    const ret = await db.collection(collection).insertOne(data)
    return formatReturnSuccess(ret.ops)
  } catch (e) {
    return formatReturnError('insertOne', e)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {object} filter filter criteria
 * @param {object} project a valid projection
 * @returns {object} { data: [], error: '' } where data is an array of one or more documents
 *
 */
export const find = async (collection, filter = {}, project = {}) => {
  // currently find returns _id as an Object. The client will always get a string.
  // I see no reason to pass an ObjectID back here, it just increases complexity in
  // testing and in the routes when validating.
  // Going to try to always pass back the id as a string and see how it goes
  // ** check other functions where ObjectID may be passed back
  // actuall, maybe I don't care?
  try {
    const { db } = await connectDB()
    const ret = await db
      .collection(collection)
      .find(filter)
      .project(project)
      .toArray()
    return formatReturnSuccess(ret)
  } catch (e) {
    return formatReturnError('find', e)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {string} id a valid _id as string
 * @param {object} project a valid projection
 * @returns {object} { data: [], error: '' } where data is always an array of 1
 */
export const findById = async (collection, id, project = {}) => {
  try {
    const { db } = await connectDB()
    const ret = await db
      .collection(collection)
      .find({ _id: ObjectID(id) })
      .project(project)
      .toArray()
    return formatReturnSuccess(ret)
  } catch (e) {
    return formatReturnError('findById', e)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {string} id a valid _id as string
 * @returns {object} { data: [], error: '' } where data is always an array of 1
 */
export const findOneAndDelete = async (collection, id) => {
  try {
    const { db } = await connectDB()
    const ret = await db
      .collection(collection)
      .findOneAndDelete({ _id: ObjectID(id) })
    return formatReturnSuccess([ret.value])
  } catch (e) {
    red('e', e)
    return formatReturnError('findOneAndDelete', e)
  }
}

/**
 *
 * @param {string} collection the name of a collection
 * @param {string} id a valid _id as string
 * @param {object} update document properties to be updated such as { title: 'new title', completed: true }
 * @param {boolean} returnOriginal if true, returns the original document instead of the updated one
 * @returns {object} { data: [], error: '' } where data is always an array of 1
 *
 */
export const findOneAndUpdate = async (
  collection,
  id,
  update,
  returnOriginal = false
) => {
  try {
    // if the filter has the _id prop, remove it
    const cleanedUpdate = removeIdProp(update)
    const { db } = await connectDB()
    const ret = await db
      .collection(collection)
      .findOneAndUpdate(
        { _id: ObjectID(id) },
        { $set: cleanedUpdate },
        { returnOriginal: returnOriginal }
      )
    return formatReturnSuccess([ret.value])
  } catch (e) {
    return formatReturnError('findOneAndUpdate', e)
  }
}
