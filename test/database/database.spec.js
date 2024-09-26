const request = require('supertest')
const database = require('../../src/database/database')
const config = require('../../src/config')

describe('database interactor testing suite', () => {
    describe('basic connectivity tests', () => {
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
                failure = true
            }

            expect(failure).toBeTruthy()

            config.db.connection.host = oldConfigHost
        })
    })

    describe('menu item tests', () => {
        beforeEach( async () => {
            await database.DB.initialized 
            await database.DB.query(await database.DB.getConnection(), `DROP DATABASE IF EXISTS ${config.db.connection.database}`, [])
            await database.DB.initializeDatabase()
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
        
    })


})