var express = require("express"),
	session = require("express-session"),
	helmet = require("helmet"),
	crypto = require("crypto"),
	path = require("path"),
	favicon = require("serve-favicon"),
	csurf = require("csurf"),
	nodemailer = require("nodemailer"),
	i18n = require("i18n"),
	app = express(),
	middleware = require("./middleware");
	// answer = require("./middleware/contact"); jsDOMの保留中

app.set("view engine", "ejs");

// 以下、helmetの各種httpヘッダ内に記載すべきセキュリティ設定
// X-Frame-Optionsを含めることで、クリックジャッキングを防止
app.use(helmet.frameguard({ action: "SAMEORIGIN" }));
app.use(helmet.hidePoweredBy());
// Content-Security-Policyで当サイトのものだけ見る事ができ、それ以外の参照元からのスクリプトは読み込まないように設定する
// インラインスクリプトでJSファイルを扱っているので、nonceが必要。まずres.locals.nonceにcryptoで取得した乱数を代入させる
app.use(function(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString("hex");
  next();
});
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			"default-src": ["'self'"],
			"script-src": [
				"'self'",
				(req, res) => `'nonce-${res.locals.nonce}'`
			],
			"font-src": [
				"'self'",
				"'unsafe-inline'",
				"fonts.gstatic.com",
				"https://use.fontawesome.com",
				"https://netdna.bootstrapcdn.com",
				"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css",
				"data: *"
			],
			"style-src": [
				"'self'",
				"'unsafe-inline'",
				"fonts.googleapis.com",
				"https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css",
				"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css"
			],
			"img-src": [
				"'self'",
				"data: *"
			]  
		}
	}
}));
// helmet.dnsPrefetchControl sets the X-DNS-Prefetch-Control header to help control DNS prefetching, which can improve user privacy at the expense of performance.
app.use(helmet.dnsPrefetchControl());
// helmet.expectCt sets the Expect-CT header which helps mitigate misissued SSL certificates.
// Sets "Expect-CT: max-age=86400, enforce, report-uri=""
app.use(
  helmet.expectCt({
    maxAge: 86400,
    enforce: true,
	// reportUriここは自分でURL設定する
    reportUri: "",　
  })
);
// Sets "Strict-Transport-Security: max-age=15552000" サーバとの通信において、セキュアな（HTTP通信に対するSSL/TLS）接続を強制的に実行
app.use(
  helmet.hsts({
    maxAge: 15552000,
    includeSubDomains: false,
    preload: true,
  })
);
// Sets "X-Content-Type-Options: nosniff" This mitigates MIME type sniffing which can cause security vulnerabilities.
app.use(helmet.noSniff());
// Sets "X-Permitted-Cross-Domain-Policies: none" Adobe Acrobat/FlashPlayer 関連のヘッダ。これらのファイルを扱わないサイトでは、全てのポリシーファイルを不許可とする設定を推奨。
app.use(
  helmet.permittedCrossDomainPolicies({
    permittedPolicies: "none",
  })
);
// Sets "Referrer-Policy: same-origin" ブラウザがリンクのアクセス元を記録するリファラーはsame-originからのものだけを設定。
app.use(
  helmet.referrerPolicy({
    policy: "no-referrer",
  })
);
// Sets "X-XSS-Protection: 0" 最近のブラウザでは、クロスサイトスクリプティング（XSS）フィルタが有効になる
app.use(helmet.xssFilter());

// CSSファイル読み込み
app.use(express.static(__dirname + "/public"));
// favicon読み込み
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")))

// Set up for language switching
// For serving the same static files with different language url, you could:
app.use(express.static(path.join(__dirname, 'views')));
i18n.configure({
        locales:['ja', 'en'],  
			// デフォルトの言語は日本語
            defaultLocale: 'ja', 
			// localesファイル内に言語データがある
            directory: __dirname + '/locales',
			 // query parameter to switch locale (ie. /home?lang=ch) - defaults to NULL
            queryParameter: 'lang',
			 // setting of log level DEBUG - default to require('debug')('i18n:debug')
            logDebugFn: function (msg) {
              console.log('debug', msg);
            },
			// setting of log level WARN - default to require('debug')('i18n:warn')
            logWarnFn: function (msg) {
              console.log('warn', msg);
            },
			// setting of log level ERROR - default to require('debug')('i18n:error')
            logErrorFn: function (msg) {
              console.log('error', msg);
            }
            });
app.use(i18n.init);

// お問い合わせフォームCSRF対策
const sess = {
  secret: "This is a secret",
  cookie: { maxAge: 60000 },
  resave: false,
  saveUninitialized: true,
}
if (app.get("env") === "production") {
  app.set("trust proxy", 1)
  sess.cookie.secure = true
}
// Middleware function for CSRF measure
  // セッションにトークンを保持してCSRF対策を行うので cookie オプションをfalseに設定
const csrfProtection = csurf({ cookie: false });
app.use(express.urlencoded({extended: true }));
app.use(session(sess));
// show and make token in contact form
app.get("/contact", csrfProtection, middleware.checkServerError, (req, res) => {
  // csrfToken付きでページを返す
  res.render("contact", { csrfToken: req.csrfToken() });
});
// POST route from contact form with nodemailer
app.post("/contact", csrfProtection, middleware.checkServerError, (req, res) => {
    // Instantiate the SMTP server
			var smtpTrans = nodemailer.createTransport({
				host: "smtp.gmail.com",
				port: 465,
				secure: true, // SSL
				auth: { //絶対にGitHubのような公開コードリポジトリに保管しない
				  type: "OAuth2",
				  user: "Ariel.WebandEnglish@gmail.com",
				  clientId: "500561616448-bfocesn1hmdkrn0i54i6tqp43jgucoss.apps.googleusercontent.com",
				  clientSecret: "iJc0vqSPWrmdtir5V2uZk_AU",
				  refreshToken: "1//04tWVvNSWoFCyCgYIARAAGAQSNwF-L9IrVhjjpPEljMfBGknN34rtLy-wGu-D6tzMGMIXSrOK_hFb2dpYl-zvchZKGmt2Sg5ICTY"
				}
			})
	// Specify what the email will look like
			const mailOpts = {
				from: "Portfolioからのお問い合わせ", // This is ignored by Gmail
				to: "Ariel.WebandEnglish@gmail.com",
				subject: "Portfolioからのお問い合わせ",
				text: `会社名: ${req.body.companyname} /お名前： ${req.body.username} /メールアドレス：(${req.body.email}) says: /本文：${req.body.message}`
			   }	// /項目：${answer}はjsDOMで保留中
	// Attempt to send the email
			  smtpTrans.sendMail(mailOpts, (error, response) => {
				if (error) {
				  console.log(error);
				  res.render("../views/errors/contactError"); // Show a page indicating failure
				}
				else {
				  console.log(response);
				  res.render("result"); // Show a page indicating success
				}
			  })
});

// ROUTES
app.get("/", middleware.checkServerError, function(req, res){
	res.render("index");
});
app.get("/blog", middleware.checkServerError,　function(req, res){
	res.render("blog");
});

// 404Error
app.use(function (request, response, next) {
    // 出力するデータ
    var data = {
        method: request.method,
        protocol: request.protocol,
        version: request.httpVersion,
        url: request.url
    };
    // エラーを返却
    response.status(404);
    if (request.xhr) {
        response.json(data);
    } else {
        response.render('../views/errors/404', { data: data });
    }
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started!");
});