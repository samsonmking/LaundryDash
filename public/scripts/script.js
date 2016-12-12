$(function() {
	var socket = io();
	socket.on('update', function(msg) {
		$('.state').html(msg.state);
		if ('count' in msg) {
			var count = msg.count;
			var min = calcMin(count);
			var sec = calcSec(count);
			$('.min').html(min);
			$('.sec').html(sec);
		}
		else {
			var limit = msg.limit;
			var min = calcMin(limit);
			var sec = calcSec(limit);
			$('.min').html(min);
			$('.sec').html(sec);
		}
	});
});

function calcMin(count) {
	return Math.floor(count / 60);
}

function calcSec(count) {
	return count % 60;
}