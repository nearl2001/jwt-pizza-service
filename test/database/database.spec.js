// const request = require('supertest')
const database = require('../../src/database/database')
const config = require('../../src/config')
const { Role } = require('../../src/model/model')

describe('database interactor testing suite', () => {
    beforeAll(async () => {
        config.db.connection.database = 'testPizza'
        await database.DB.initializeDatabase()
        await database.DB.initialized
    })

    afterAll(async () => {
        const connection = await database.DB.getConnection()
        await database.DB.query(connection, 'DROP DATABASE IF EXISTS testPizza')
        await connection.end()
    })

    test('initialize runs as expected when db is functional', () => {
        expect(database.DB.initialized).toBeTruthy()
    })

    test('proper failure when db doesnt connect', async () => {
        const oldConfigHost = config.db.connection.host
        config.db.connection.host = 'this is an invalid host and should cause a failure'
        let failure = false
        await database.DB.initializeDatabase()
        try {
            await database.DB.checkDatabaseExists()
        } catch (e) {
            console.log(e)
            failure = true
        }

        expect(failure).toBeTruthy()

        config.db.connection.host = oldConfigHost
    })

    test('test valid menu item addition', async () => {
        await database.DB.addMenuItem({
            title: 'Test Pizza', 
            description: 'A Test Pizza', 
            image: 'image string', 
            price: 20.00
        })

        const menuItemsResult = await database.DB.getMenu()
        expect(menuItemsResult.length).toEqual(1)
        expect(menuItemsResult[0]).toStrictEqual(
            {
                title: 'Test Pizza', 
                id: 1,
                description: 'A Test Pizza', 
                image: 'image string', 
                price: 20.00
            }
        )
    })   

    test('valid user addition', async () => {
        const testUserToAdd = {
            name: 'Gertrude',
            email: 'gerty@byu.edu',
            password: 'aSuperSecurePassword',
            roles: [{ role: Role.Diner }]
        }

        await database.DB.addUser(testUserToAdd)
        const resultingUser = await database.DB.getUser('gerty@byu.edu', 'aSuperSecurePassword')
        expect(resultingUser).toStrictEqual({
            email: "gerty@byu.edu", 
            id: 3, 
            name: "Gertrude", 
            password: undefined, 
            roles: [
                {
                    role: Role.Diner, 
                    objectId: undefined
                }
            ]
        })
    })

    test('valid user update', async () => {
        const testUserToAdd1 = {
            name: 'Marty',
            email: 'marty@byu.edu',
            password: 'aSuperSecurePassword',
            roles: [{ role: Role.Franchisee, 
                object: 'testingFranchise' }]
        }
        const testUserToAdd2 = {
            name: 'Administrator',
            email: 'administrator@byu.edu',
            password: 'aSuperSecurePassword',
            roles: [{ role: Role.Admin }]
        }

        await database.DB.addUser(testUserToAdd2)

        const testFranchiseToAdd = {
            admins: [{
                email: 'administrator@byu.edu'
            }],
            name: 'testingFranchise'
        }

        await database.DB.createFranchise(testFranchiseToAdd)

        await database.DB.addUser(testUserToAdd1)

        await database.DB.updateUser(4, "updatedEmail@byu.edu", "updatedPassword")

        expect(await database.DB.getUser("updatedEmail@byu.edu", "updatedPassword")).toEqual({
            email: 'updatedEmail@byu.edu', 
            id: 4,
            name: "Administrator",
            password: undefined,
            roles: [{
                    objectId: undefined,
                    role: "admin",
                },
                {
                    objectId: 1,
                    role: "franchisee",
                },
            ]})
    })


})