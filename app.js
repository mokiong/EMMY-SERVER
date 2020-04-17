// const createError = require('http-errors');
const http        = require('http');
const path        = require('path');
const logger      = require('morgan');
const socketIO    = require('socket.io');
const cors        = require('cors');
const express     = require('express');
const ip          = require('ip');
const helmet      = require('helmet');
const fileUpload  = require('express-fileupload');
const colors      = require('colors');
const RateLimit 	= require('express-rate-limit');
const MongoStore 	= require('rate-limit-mongo');
//const dotenv      = require('dotenv');

// LOAD ENVIRONMENT VARIABLES ---------------------------------------------------------------------------------
//const cfg = dotenv.config().parsed;
const cfg = require('./configs/dotenv');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = cfg.port || 3000;
colors.enable();
const { createDBConnection } = require('./db');

// APPLICATION CONFIGURATIONS ---------------------------------------------------------------------------------
const limiter = new RateLimit({
	store: new MongoStore({
		//client: mongo,
		uri: createDBConnection,
		collectionName: "expressRateLimitRecord"
		}),
	max: 100, //number of request threshold
	windowMs: 15 * 60 * 1000, //15mins per 100request threshold
	delayMs: 0
});

app.use(limiter);
app.use(helmet());
app.use(helmet.hidePoweredBy());
//app.disable('x-powered-by');
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.contentSecurityPolicy({
	directives: {
	defaultSrc: ["'self'"]
	}
}))
app.use(helmet.featurePolicy({
	features: {
		fullscreen: ["'*'"],
		vibrate: ["'none'"],
		payment: ["'none'"],
		camera: ["'none"],
		geolocation: ["'none'"],
		microphone: ["'none'"]
	}
}))
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "client"))); // the directory for Vue
app.use(cors());
app.use(
	fileUpload({
		debug: false,
	})
);

// IMPORT & CONFIGURE ROUTES ----------------------------------------------------------------------------------
const employeeLogsRoute = require("./routes/employee-logs")(io);
const employeeRoute = require("./routes/employee")(io);
const utilityRoute = require("./routes/main")(io);
const authRoute = require("./routes/auth")(io);

app.use("/auth", authRoute); 								// localhost:3000/auth/
app.use("/main", utilityRoute); 							// localhost:3000/utility
app.use("/api/employees", employeeRoute); 			// localhost:3000/api/employees/
app.use("/api/employeelogs", employeeLogsRoute); 	// localhost:3000/api/employeelogs/
app.get(/.*/, (req, res) => {
	// localhost:3000/* (for serving vue spa)
	res.sendFile(__dirname + "/client/index.html");
});
// CATCH 404 AND FORWARD REQUEST TO ERROR HANDLER -------------------------------------------------------------
// REMOVE: Not sure if removing middleware will have serious side effects. will disable temporarily
// app.use((req, res, next) => {
// 	next(createError(404));
// });
// ERROR HANDLER ---------------------------------------------------------------------------------------------
app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	res.status(err.status || 500);
	res.render("error");
});
// BOOSTRAPPER ---------------------------------------------------------------------------------------------	--
async function bootstrap() {
	try {
		console.clear();
		console.log("Starting Application...".black.bgGreen + "\nInitializing connection to database...");

		// initialize database connection
		let connection = await createDBConnection(cfg.dbname, cfg.dbport);

		console.log(
			" SERVER RUNNING ".black.bgGreen + "\n" +
			"\nMongoDB Database: " + connection.connection.name.green
		);

		// node always assume its dev environment
		const environment = (cfg.env == 'development') ? "Development".green : "Production".black.bgWhite; //always false no matter what
		const host_url = 'http://localhost:'.cyan + PORT.brightCyan;
		const net_url = `http://${ip.address()}:`.cyan + PORT.brightCyan;

		server.listen(PORT, () => {
			console.log(
				"--------------------------------------------------\n" +
				"- Environment: " + environment + "\n" +
				"- local: " + host_url + "\n" +
				"- network: " + net_url +
				"\n--------------------------------------------------"
			);
		});
	} catch (error) {
		console.log("INTERNAL SERVER ERROR (500)".bgRed);
		console.error(error);
		throw new Error(error);
	}
}

bootstrap();
