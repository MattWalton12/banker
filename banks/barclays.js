var Horseman = require("node-horseman"),
	phantomjs = require("phantomjs"),
	url = require("url");

exports.name = "Barclays Personal";

exports.methods = {};
exports.horseman = {};

exports.methods.init = function(cb) {
	cb(null, new Horseman({phantomPath: phantomjs.path, timeout: 30000}))
}

exports.mainPage = "";

exports.methods.authenticate = function(horseman, details, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open("https://www.barclays.co.uk/")
		
		.click("a[title=\"Log in to Online Banking\"]")
		.waitForNextPage()

		.value("input#surname", details.surname)
		.click("#account-radio")
		
		.value("#sortCodeSet1", details.sortCode[0])
		.value("#sortCodeSet2", details.sortCode[1])
		.value("#sortCodeSet3", details.sortCode[2])
		.value("#the-account-number", details.accountNumber)

		.click("#forward")
		.waitForSelector(".reference-number")

		.click("#passcode-radio")
		.wait(1000)
		.value("#passcode", details.passcode)
		.wait(1000)
		.evaluate(function(password) {
			var passwordChars = [];

			var numberText = ["One", "Two", "Three", "Four"];
	

			$(".letter-select legend strong").each(function() {
				passwordChars.push(parseInt($(this).html().substr(0, $(this).html().length -2)));
			});

			for (var i=0; i<passwordChars.length; i++) {
				$("#name" + numberText[i] + " option").filter(function() {
    				return $(this).text() == password[passwordChars[i] - 1]; 
				}).attr('selected', true);
			}

			$("#log-in-to-online-banking2").click()
		}, details.password.toLowerCase())

		.waitForSelector("#logged-on-message")
		.url()
		.then(function(pageUrl) {
			if (horseman.exists("#logged-on-message")) {
				exports.mainPage = pageUrl;
				cb(null);
			} else {
				cb(new Error("Failed to login - check credentials"));
			}
		})
}

exports.methods.getAccounts = function(horseman, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open(exports.mainPage)
		.evaluate(function() {
			var account = {};

			account.name = $("span.account-name").text().trim();
			var sortAccount = $("span.account-detail").text().trim().split(" ");
			account.sortCode = sortAccount[0];
			account.accountNumber = sortAccount[1];
			account.balance = parseFloat($(".balance strong").text().substr(1));

			return [account]
		})
		.then(function(accounts) {
			cb(null, accounts);
		});
}
	

exports.methods.close = function(horseman) {
	horseman.close();
}