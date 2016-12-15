const dash_button = require('node-dash-button')
const { hw, washTime, dryTime, pushToken } = require('./config.js')
const Rx = require('rxjs')
const Observable = Rx.Observable
const _ = require('lodash')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const PushBullet = require('pushbullet')
const pusher = new PushBullet(pushToken)

app.use(express.static('public'))
app.use(express.static('node_modules/jquery/dist'))

http.listen(3000, function(){
  console.log('listening on *:3000')
})

const mode = [
	{state: 'Idle', step: 0, limit: 0},
	{state: 'Washing', step: 1, limit: washTime * 60},
	{state: 'Drying', step: 2, limit: dryTime * 60 }
]

const dash = dash_button(hw, null, null, 'all')
const button$ = Observable.fromEvent(dash, 'detected')
const timer$ = (settings) => (Observable.interval(1000).take(settings.limit))

const washMode$ = button$
	.startWith(Object.assign({}, _.head(mode)))
	.scan((acc, curr) => (Object.assign({}, _.find(mode, m => (m.step == acc.step + 1)))))
	.takeWhile(curr => _.has(curr, 'step'))
	.repeat()
	.share()

const washTimer$ = washMode$
	.switchMap(settings => timer$(settings)
		.map(count => (Object.assign({}, settings, {count: settings.limit - (count + 1)}))))
	.takeUntil(washMode$.filter(mode => mode.limit === 0))
	.repeat()
	.share()

const socketConn$ = Observable.fromEvent(io, 'connection')

const washUpdates$ = Observable.merge(
	washMode$.map(t => (acc => (t))), 
	washTimer$.map(t => (acc => (t))),
	socketConn$.mapTo(acc => (acc)))
	.startWith(Object.assign({}, _.head(mode)))
	.scan((acc, curr) => {
		return curr(acc)
	})
	.share()

// Socket-io ticker push
washUpdates$.subscribe(data => {
	io.emit('update', data)
})

// Pushbullet state change notification
washMode$.subscribe(d => {
	pusher.note({}, 'Laundry ' + d.state, '')
})

// Pushbullet Complete Notification
washUpdates$
	.filter(u => u.count == 0)
	.subscribe(d => {
		pusher.note({}, 'Laundry ' + d.state + ' Complete', '')
	})