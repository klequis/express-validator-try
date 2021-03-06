import express from 'express'
import { check, validationResult } from 'express-validator/check'
import { insertOne } from 'db'
import { yellow } from 'logger'

const router = express.Router()

const collectionName = 'users'

router.post(
  '/',
  [
    check('email').isEmail(),
    check('username').isLength(3)
  ],
  async (req, res) => {
    try {
      const user = req.body
      const errors = validationResult(req)
      // console.log('errors', errors)
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() })
      }
      // const user = req.body()
      const ret = await insertOne(collectionName, user)
      yellow('ret', ret)
      res.send(user)
    } catch (e) {
      console.error('error', e)
      res.status(400).send(e)
    }
  }
)

export default router