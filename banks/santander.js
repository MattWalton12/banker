var Horseman = require("node-horseman"),
	phantomjs = require("phantomjs"),
	url = require("url");

exports.name = "Santander Personal";

exports.methods = {};
exports.horseman = {};

exports.methods.init = function(cb) {
	cb(null, new Horseman({phantomPath: phantomjs.path, timeout: 30000}))
}

exports.mainPage = "";

exports.methods.authenticate = function(horseman, details, cb) {
	function login() {
		horseman.text(".container h2")

		.then(function(text) {
			if (text.indexOf("We are unfamiliar with the computer you are using") != -1) {
				horseman.evaluate(function(data) {
					var question = $($("form .data")[0]).html().trim();

					for (i=0; i<data.length; i++) {
						if (data[i].question == question) {
							$("form input[type=text]").val(data[i].answer)
						}
					}

					$("form").submit();

				}, details.securityAnswers)

				horseman.waitForNextPage()
				.then(function() {
					login();
				})
			} else {
				horseman.evaluate(function(password, securityNumber) {
					$($(".positions")[0]).find("label").each(function(i) {
						var pos = parseInt($(this).find("strong").html());
						$("input[name=signPosition" + (i+1) + "]").val(password[pos-1])
					})

					$($(".positionKey")[1]).find("input[type=password]").each(function() {
						$(this).val(securityNumber[parseInt($(this).attr("id").split("passwordPosition")[1]) - 1]);
					})			

					$("#formAuthenticationAbbey").submit();
				}, details.password, details.securityNumber)
				.waitForNextPage()
				.url()
				.then(function(pageUrl) {
					if (horseman.exists(".accountlist")) {
						exports.mainPage = pageUrl;
						cb(null, horseman); 
					} else {
						cb(new Error("Failed to login - check credentials"))
					}
				});
			}

		});
	}

	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open("http://www.santander.co.uk/")
		
		.click(".login01 p a[name=LoginLink]")
		.waitForNextPage()
		.value("#formCustomerID_1 input[type=text]", details.customerID)
		.injectJs(__dirname + "/../jquery.min.js")
		.evaluate(function(customerID) {
			$("#formCustomerID_1").submit();
		}, details.customerID)
		.waitForNextPage()
		.then(login);

}

exports.methods.getAccounts = function(horseman, cb) {
	horseman.userAgent("Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")
		.open(exports.mainPage)
		.evaluate(function() {
			var accounts = [];

			$($(".accountlist")[0]).find("li").each(function() {
				accounts.push({
					name: $(this).find(".info .name a ").html().trim(),
					sortCode: $(this).find(".info .number").html().split(" ")[0].trim(),
					accountNumber: $(this).find(".info .number").html().split(" ")[1].trim(),
					balance: parseFloat($(this).find(".balance .extrainfo").html().split("Available:£")[1].trim())
				});
			})

			return accounts;
		})

		.then(function(accounts) {
			cb(null, accounts)
		});
}
	

exports.methods.close = function(horseman) {
	horseman.close();
}