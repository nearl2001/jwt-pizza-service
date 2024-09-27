const request = require('supertest')
const app = require('../../src/service')
const config = require('../../src/config')
const database = require('../../src/database/database')
const { Role } = require('../../src/model/model')

describe('franchiseRouter testing suite', () => {
    let adminAuthToken
    let dinerAuthToken
    
    afterAll(async () => {
        const connection = await database.DB.getConnection()
        await database.DB.query(connection, `DROP DATABASE IF EXISTS ${config.db.connection.database}`)
        await connection.end()
    })

    beforeAll(async () => {
        // Add an admin user that can administer franchises
        const testAdminUser = {
            name: 'anotherAdmin',
            email: 'nikkiminaj@byu.edu',
            password: 'starshipsAreMeantToFly',
            roles: [{ role: Role.Admin }]
        }
        const testLayUser = {
            name: 'umaSoSmall',
            email: 'reallySmolBoi@byu.edu',
            password: 'itsReallyLateAsImWritingThis',
            roles: [{ role: Role.Diner }]
        }
        await database.DB.addUser(testAdminUser)
        await database.DB.addUser(testLayUser)

        wait(1500)

        let result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"nikkiminaj@byu.edu", password:"starshipsAreMeantToFly"})
        adminAuthToken = result._body.token

        wait(500)

        result = await request(app).put('/api/auth').set('Content-Type', 'application/json').send({email:"reallySmolBoi@byu.edu", password:"itsReallyLateAsImWritingThis"})
        dinerAuthToken = result._body.token
    })

    test('add a menu item then get the menu', async () => {
        let result = await request(app).put('/api/order/menu').set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`).send({ title: "Student", description: "No topping, no sauce, just carbs", image: "pizza9.png", price: 0.0001 })
        expect(result.status).toEqual(403)

        result = await request(app).put('/api/order/menu').set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`).send({ title: "Student", description: "No topping, no sauce, just carbs", image: "pizza9.png", price: 0.0001 })
        expect(result._body[0].title).toEqual('Student')

        wait(500)

        result = await request(app).get('/api/order/menu')
        expect(result._body[0].title).toEqual('Student')
    })

    test('create and get an order', async () => {
        // Set up the shop to make the order
        let result = await request(app).put('/api/order/menu').set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`).send({ title: "The Sacred Almond Pizza", description: "Mmm Almonds", image: "pizza9.png", price: 0.05 })
        const tempResultsArray = result._body
        let found = false
        let menuId = 0
        for (const row in tempResultsArray) {
            if (result._body[row].title === 'The Sacred Almond Pizza') {
                found = true
                menuId = row
            }
        }
        expect(found).toBeTruthy()

        result = await request(app).post('/api/franchise').set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`).send({name: 'Le Za', admins: [{email: 'nikkiminaj@byu.edu'}]})
        expect(result._body.name).toEqual('Le Za')
        const franchiseId = result._body.id

        wait(500)

        result = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Content-Type', 'application/json').set('Authorization', `Bearer ${adminAuthToken}`).send({franchiseId, name:"Provo"})
        expect(result._body.name).toEqual('Provo')
        const storeId = result._body.id

        // Give the DB a moment to catch up
        await wait(1000)

        // Actually make the order lol
        result = await request(app).post('/api/order').set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`).send({franchiseId, storeId, items:[{ menuId, description: "The Sacred Almond Pizza", price: 0.05 }]})
        console.log(JSON.stringify(result._body))
        expect(result._body.jwt).toBeDefined()

        wait(500)

        result = await request(app).get('/api/order').set('Content-Type', 'application/json').set('Authorization', `Bearer ${dinerAuthToken}`)
        console.log(JSON.stringify(result._body))
        expect(result._body.orders[0].items[0].description).toEqual('The Sacred Almond Pizza')
    })
})

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }