const request = require('supertest')
const app = require('../../src/service')
const config = require('../../src/config')
const database = require('../../src/database/database')
const { Role } = require('../../src/model/model')

describe('authentication routing tests', () => {
    afterAll(async () => {
        const connection = await database.DB.getConnection()
        await database.DB.query(connection, `DROP DATABASE IF EXISTS ${config.db.connection.database}`)
        await connection.end()
    })

    test('post a new user to the system, log in, then log out', async () => {
        let result = await request(app).post('/api/auth').set('Content-Type', 'application/json').send({name:"pizza diner", email:"d@jwt.com", password:"diner"})
        expect(result._body.user.name).toEqual('pizza diner')

        wait(500)

        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"d@jwt.com", password:"diner"})
        expect(result._body.user.name).toEqual('pizza diner')

        wait(500)

        result = await request(app).delete('/api/auth').set('Authorization', `Bearer ${result._body.token}`)
        expect(result._body.message).toEqual('logout successful')
    })

    test('post a new user to the system, then update the user and try to log in as that new user', async () => {
        let result = await request(app).post('/api/auth').set('Content-Type', 'application/json').send({name:"Nik Earl", email:"nik@jwt.com", password:"password"})
        expect(result._body.user.name).toEqual('Nik Earl')
        const userId = result._body.user.id

        // Add an admin user that can update credentials
        const testAdminUser = {
            name: 'Administrator',
            email: 'administrator@byu.edu',
            password: 'aSuperSecurePassword',
            roles: [{ role: Role.Admin }]
        }
        await database.DB.addUser(testAdminUser)

        wait(1500)

        // Get an admin's credentials
        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"administrator@byu.edu", password:"aSuperSecurePassword"})
        const authToken = result._body.token

        wait(500)

        result = await request(app).put(`/api/auth/${Number(userId)}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({email:"newLogin@jwt.com", password:"ooSoSecure"})
        expect(result._body.name).toEqual('Nik Earl')

        wait(1000)

        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"newLogin@jwt.com", password:"ooSoSecure"})
        expect(result._body.user.name).toEqual('Nik Earl')
        expect(result._body.token === authToken).toBeFalsy()
    })

    test('new user attempts to update themself', async () => {
        let result = await request(app).post('/api/auth').set('Content-Type', 'application/json').send({name:"Nik Earl", email:"nik@jwt.com", password:"password"})
        expect(result._body.user.name).toEqual('Nik Earl')
        const userId = result._body.user.userId
        const authToken = result._body.token

        wait(1000)

        result = await request(app).put(`/api/auth/${userId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({email:"newLogin@jwt.com", password:"ooSoSecure"})
        expect(result.status).toEqual(403)
    })

    test('bogus token', async () => {
        let result = await request(app).put(`/api/auth/1`).set('Content-Type', 'application/json').set('Authorization', `Bearer ThisIsDefinitelyAWorkingToken`).send({email:"newLogin@jwt.com", password:"ooSoSecure"})
        expect(result.status).toEqual(401)
    })

    test('bad user creation request', async () => {
        let result = await request(app).post('/api/auth').set('Content-Type', 'application/json').send({email:"d@jwt.com", password:"diner"})
        expect(result.status).toEqual(400)
    })
})

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }