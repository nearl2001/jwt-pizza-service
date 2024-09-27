const request = require('supertest')
const app = require('../../src/service')
const config = require('../../src/config')
const database = require('../../src/database/database')
const { Role } = require('../../src/model/model')

describe('franchiseRouter testing suite', () => {
    afterAll(async () => {
        const connection = await database.DB.getConnection()
        await database.DB.query(connection, `DROP DATABASE IF EXISTS ${config.db.connection.database}`)
        await connection.end()
    })

    beforeAll(async () => {
        // Add an admin user that can administer franchises
        const testAdminUser = {
            name: 'bigBoiAdministrator',
            email: 'biggyCheese@byu.edu',
            password: 'betYouveNeverSeenThisPassword',
            roles: [{ role: Role.Admin }]
        }
        const testLayUser = {
            name: 'smallBoiDiner',
            email: 'smallBoiDiner@byu.edu',
            password: 'iveSeenThisPassword',
            roles: [{ role: Role.Diner }]
        }
        await database.DB.addUser(testAdminUser)
        await database.DB.addUser(testLayUser)

        wait(1500)
    })

    test('test adding franchise then getting it from main list and specifically by user', async () => {
        // first log in as admin to get token
        let result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"biggyCheese@byu.edu", password:"betYouveNeverSeenThisPassword"})
        console.log(JSON.stringify(result._body))
        const authToken = result._body.token
        const userId = result._body.user.id

        wait(500)

        result = await request(app).get(`/api/franchise/${userId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`)
        expect(result._body).toEqual([])

        wait(500)

        result = await request(app).post('/api/franchise').set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({name: 'pizzaPocket', admins: [{email: 'biggyCheese@byu.edu'}]})
        expect(result._body.name).toEqual('pizzaPocket')

        wait(500)

        result = await request(app).get('/api/franchise')
        expect(result._body[0].name).toEqual('pizzaPocket')

        wait(500)

        result = await request(app).get(`/api/franchise/${userId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`)
        expect(result._body[0].name).toEqual('pizzaPocket')

        wait(500)

        result = await request(app).delete('/api/auth').set('Authorization', `Bearer ${authToken}`)
        expect(result._body.message).toEqual('logout successful')
    })

    test('user isnt allowed to add a franchise', async () => {
        let result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"smallBoiDiner@byu.edu", password:"iveSeenThisPassword"})
        const authToken = result._body.token

        wait(500)

        result = await request(app).post('/api/franchise').set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({name: 'pizzaPocket', admins: [{email: 'biggyCheese@byu.edu'}]})
        expect(result.status).toEqual(403)

        result = await request(app).delete('/api/auth').set('Authorization', `Bearer ${authToken}`)
        expect(result._body.message).toEqual('logout successful')
    })

    test('user isnt allowed to delete a franchise', async () => {
        // first log in as admin to get token
        let result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"biggyCheese@byu.edu", password:"betYouveNeverSeenThisPassword"})
        let adminAuthToken = result._body.token

        wait(500)

        result = await request(app).post('/api/franchise').set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`).send({name: 'theCoolest', admins: [{email: 'biggyCheese@byu.edu'}]})
        expect(result._body.name).toEqual('theCoolest')
        const franchiseId = result._body.id

        wait(500)

        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"smallBoiDiner@byu.edu", password:"iveSeenThisPassword"})
        const dinerAuthToken = result._body.token

        wait(500)

        result = await request(app).delete(`/api/franchise/${franchiseId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`)
        expect(result.status).toEqual(403)

        result = await request(app).delete('/api/auth').set('Authorization', `Bearer ${dinerAuthToken}`)
        expect(result._body.message).toEqual('logout successful')

        wait(500)

        result = await request(app).delete(`/api/franchise/${franchiseId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`)
        expect(result._body.message).toEqual('franchise deleted')

        wait(500)
        
        result = await request(app).delete('/api/auth').set('Authorization', `Bearer ${adminAuthToken}`)
        expect(result._body.message).toEqual('logout successful')
    })

    test('create a store on a newly created franchise, then delete the store', async () => {
        // Give the Auth db time to catch up
        await wait(1500)

        // first log in as admin to get token
        let result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"biggyCheese@byu.edu", password:"betYouveNeverSeenThisPassword"})
        const authToken = result._body.token

        wait(500)

        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"smallBoiDiner@byu.edu", password:"iveSeenThisPassword"})
        const dinerAuthToken = result._body.token

        wait(500)

        result = await request(app).post('/api/franchise').set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({name: 'anotherOne', admins: [{email: 'biggyCheese@byu.edu'}]})
        expect(result._body.name).toEqual('anotherOne')
        const franchiseId = result._body.id

        wait(500)

        result = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`).send({franchiseId, name:"SLC"})
        expect(result.status).toEqual(403)

        result = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`).send({franchiseId, name:"SLC"})
        expect(result._body.name).toEqual('SLC')
        const storeId = result._body.id

        wait(500)

        result = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`)
        expect(result.status).toEqual(403)

        result = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${authToken}`)
        expect(result._body.message).toEqual('store deleted')
    })
})

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }