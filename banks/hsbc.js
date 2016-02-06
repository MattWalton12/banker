var Horseman = require("node-horseman"),
	phantomjs = require("phantomjs"),
	url = require("url");

exports.name = "HSBC Personal UK";

exports.methods = {};
exports.horseman = {};

exports.methods.init = function(cb) {
	cb(null, new Horseman({phantomPath: phantomjs.path, timeout: 30000}))
}

exports.mainPage = "";

exports.methods.authenticate = function(horseman, details, cb) {
	horseman.open("https://hsbc.co.uk")
		.click('#onlineBanking a.redBtn[title="Log on to Personal Internet Banking"]')
		.waitForNextPage()

		.value("#intbankingID", details.id)

		.click("#registerStep1Submit")
		.waitForSelector("#memorableAnswer")

		.screenshot("../1.png")

		.click(".containerStyle23 ul li:not(.selected) a")

		
		.waitForSelector("#hsbcwidget_CharacterChallenge_0")
		.screenshot("../2.png")
		.value("#memorableAnswer", details.answer)

		.injectJs(__dirname + "/../jquery.min.js")

		.evaluate(function(password) {
			var numberNames = {
				first: 1,
				second: 2,
				third: 3,
				fourth: 4,
				fifth: 5,
				sixth: 6,
				seventh: 7,
				eighth: 8,
				ninth: 9,
				tenth: 10,
				eleventh: 11
			}

			var chars = [];
			$("#hsbcwidget_CharacterChallenge_0 h4 span").each(function() {
				var val = $(this).html();

				if (val == "last") {
					chars.push(password.length);
				} else if (val.indexOf("last") != -1) {
					chars.push(password.length + 1 - numberNames[val.split(" ")[0]]);
				} else {
					chars.push(numberNames[val]); 
				}

			});

			$("#hsbcwidget_CharacterChallenge_0 fieldset input:enabled").each(function(i) {
				$(this).val(password[chars[i] - 1]);
			});


		}, details.password)
		.screenshot("../3.png")
		.click("input[value=Continue]")
		
		.waitForSelector(".extContentHighlightPib")
		.screenshot("../4.png")

		.url()
		.then(function(pageUrl) {
			exports.mainPage = pageUrl;

			if (horseman.exists(".extContentHighlightPib")) {
				cb(null, horseman);
			} else {
				cb(new Error("Failed to login - check credentials"));
			}
		});

}

exports.methods.getAccounts = function(horseman, cb) {
	horseman.open(exports.mainPage)
		.injectJs(__dirname + "/../jquery.min.js")
		.evaluate(function() {
			var accounts = [];

			$("table[summary=\"This table shows the current balance of all your accounts\"] tbody tr").each(function() {
				accounts.push({
					name: $(this).find(".col1 .col1.rowNo1 a").html().trim(),
					sortCode: $(this).find(".col2 .col2.rowNo1").html().split(" ")[0].trim(),
					accNumber: $(this).find(".col2 .col2.rowNo1").html().split(" ")[1].trim(),
					balance: parseFloat($(this).find(".col3 .col3.rowNo1 strong").html().split(" ")[0].trim())
				});
			})

			return accounts;
		})
		.then(function(accounts) {
			cb(null, accounts);
		});
}

exports.methods.close = function(horseman) {
	horseman.close();
}