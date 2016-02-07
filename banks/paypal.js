var Horseman = require("node-horseman"),
	phantomjs = require("phantomjs"),
	url = require("url");

exports.name = "PayPal UK";

exports.methods = {};
exports.horseman = {};

exports.methods.init = function(cb) {
	cb(null, new Horseman({phantomPath: phantomjs.path, timeout: 30000}))
}

exports.mainPage = "";

exports.methods.authenticate = function(horseman, details, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open("https://www.paypal.com/signin/?country.x=GB&locale.x=en_GB")
		.value("#email", details.email)
		.value("#password", details.password)
		.click("#btnLogin")
		.waitForSelector(".balanceNumeral")
		.url()
		.then(function(pageUrl) {
			if (horseman.exists(".balanceNumeral")) {
				exports.mainPage = pageUrl;
				cb(null)
			} else {
				cb(new Error("Failed to login - check credentials"))
			}
		});		
}

exports.methods.getAccounts = function(horseman, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open(exports.mainPage)
		.injectJs(__dirname + "/../jquery.min.js")
		.evaluate(function() {
			var account = {};

			account.name = $("li.email").text().trim();
			account.sortCode = "PayPal";
			account.accountNumber = "PayPal";
			account.balance = parseFloat($(".balanceNumeral .vx_h2").text().substr(1));

			return [account]
		})
		.then(function(accounts) {
			cb(null, accounts);
		});
}

exports.methods.withdraw = function(horseman, amount, account, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.url()
		.then(function(url) {
			if (url != exports.mainPage) {
				horseman.open(exports.mainPage);
			}
		})
		.text(".withdrawBank .field")
		.click("#classicWithdrawFunds")
		.waitForNextPage()

		.value("#amount", amount)
		.injectJs(__dirname + "/../jquery.min.js")
		.evaluate(function(accountNumber) {
			$("#arch_id option").each(function() {
				console.log($(this).text(), $(this).text().indexOf(accountNumber))
				if ($(this).text().indexOf(accountNumber) != -1) {
					$(this).attr("selected", true);
				}
			})
		})

		.wait(300)
		.click("input[value=Continue]")
		.waitForNextPage()
		.then(function() {
			if (horseman.exists("#submitButton")) {
				horseman.click("#submitButton")
				.waitForNextPage()
				.then(function() {
					cb(null)
				});
			} else {
				var error = $(".error p");
				cb(new Error(error))
			}
		});
		
}
	

exports.methods.close = function(horseman) {
	horseman.close();
}