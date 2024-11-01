const config = require('./config.js')
const { DB } = require('./database/database.js')
const os = require('os')

class Metrics {
  constructor() {

    // ------- Per-Minute Metrics -------
    this.totalGetRequests = 0
    this.totalDeleteRequests = 0
    this.totalPutRequests = 0
    this.totalPostRequests = 0

    this.validLogins = 0
    this.invalidLogins = 0

    this.pizzasOrdered = 0
    this.revenue = 0
    this.orderFailures = 0

    // This will periodically sent metrics to Grafana
    const timer = setInterval(async () => {
      // Grab logged in users...
      const loggedInUsers = await DB.getLoggedInUserCount()

      // ------- Per-Minute Metrics -------
      this.sendMetricToGrafana('request', 'all', 'countPerMinute', this.totalGetRequests + this.totalPostRequests + this.totalDeleteRequests + this.totalPutRequests)
      this.sendMetricToGrafana('request', 'get', 'countPerMinute', this.totalGetRequests)
      this.sendMetricToGrafana('request', 'delete', 'countPerMinute', this.totalDeleteRequests)
      this.sendMetricToGrafana('request', 'put', 'countPerMinute', this.totalPutRequests)
      this.sendMetricToGrafana('request', 'post', 'countPerMinute', this.totalPostRequests)
      this.sendMetricToGrafana('validLogins', 'all', 'countPerMinute', this.validLogins)
      this.sendMetricToGrafana('invalidLogins', 'all', 'countPerMinute', this.invalidLogins)
      this.sendMetricToGrafana('pizzasOrdered', 'all', 'countPerMinute', this.pizzasOrdered)
      this.sendMetricToGrafana('revenueEarned', 'all', 'dollarsPerMinute', this.revenue)
      this.sendMetricToGrafana('orderFailures', 'all', 'countPerMinute', this.orderFailures)

      // ------- Timeless Metrics -------
      this.sendMetricToGrafana('cpu', 'all', 'usage', this.getCpuUsagePercentage())
      this.sendMetricToGrafana('memory', 'all', 'usage', this.getMemoryUsagePercentage())
      this.sendMetricToGrafana('activeUsers', 'all', 'count', loggedInUsers)

      this.resetMinuteMetrics()
    }, 60000)
    timer.unref()
  }

  recordValidRequest(request, response) {
    let responseBody
    if (typeof response.body === "string") {
      responseBody = JSON.parse(response.body)
    } else {
      responseBody = response.body
    }

    if (request.method === 'GET') {
      this.totalGetRequests += 1
    }

    if (request.method === 'DELETE') {
      this.totalDeleteRequests += 1
    }

    if (request.method === 'PUT') {
      this.totalPutRequests += 1

      if (request.originalUrl === '/api/auth') {
        if (responseBody.token != null) {
          this.validLogins += 1
        } else {
          this.invalidLogins += 1
        }
      }
    }

    if (request.method === 'POST') {
      this.totalPostRequests += 1

      if (request.originalUrl === '/api/order') {
        if (responseBody.order != null) {
          const pizzasOrdered = responseBody.order.items.length
          let totalCost = 0
          for (let i = 0; i < pizzasOrdered; i++) {
            totalCost += responseBody.order.items[i].price
          }
          // Note, this function is called twice per order, that's why the / 2 is there
          this.pizzasOrdered += pizzasOrdered / 2
          this.revenue += totalCost / 2
        } else {
          this.orderFailures += 1
        }
      }
    }
  }

  reportFactoryLatency(timeTaken) {
    this.sendMetricToGrafana('factoryLatency', 'all', 'value', timeTaken)
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length
    return cpuUsage.toFixed(2) * 100
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryUsage = (usedMemory / totalMemory) * 100
    return memoryUsage.toFixed(2)
  }

  incrementGetRequests() {
    this.totalGetRequests++
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`

    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana')
        } else {
          console.log(`Pushed ${metric}`)
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error)
      })
  }

  resetMinuteMetrics() {
    this.totalGetRequests = 0
    this.totalDeleteRequests = 0
    this.totalPutRequests = 0
    this.totalPostRequests = 0
    this.validLogins = 0
    this.invalidLogins = 0
    this.pizzasOrdered = 0
    this.revenue = 0
    this.orderFailures = 0
  }

}

const metrics = new Metrics()
module.exports = metrics