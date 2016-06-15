import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as cluster from 'cluster';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as gm from 'gm';
import config from './config';

const app = express();
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({extended: true}));

// CORS middleware
app.use((req, res, next) => {
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Allow-Credentials': 'false'
	});

	 // intercept OPTIONS method
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
});

app.get('/', (req, res) => {
	res.send('Misskeyにアップロードされたファイルを保管・配信するサーバーです。https://misskey.xyz');
});

app.get('*', (req, res) => {
	const path = decodeURI(req.path);
	const filePath = `${config.storagePath}/${path}`;

	fs.stat(filePath, (err, stat) => {
		if (err === null) {
			let g: any = null;

			if (path.indexOf('..') !== -1) {
				return res.status(400).send('invalid path');
			}

			if (req.query.download !== undefined) {
				res.header('Content-Disposition', 'attachment');
				res.sendFile(`${config.storagePath}/${path}`);
				return;
			}

			if (req.query.thumbnail !== undefined) {
				gm(filePath)
				.resize(150, 150)
				.compress('jpeg')
				.quality(80)
				.toBuffer('jpeg', (genThumbnailErr: Error, thumbnail: Buffer) => {
					res.header('Content-Type', 'image/jpeg');
					res.send(thumbnail);
				});
				return;
			}

			if (req.query.size !== undefined) {
				if (g === null) {
					g = gm(`${config.storagePath}/${path}`);
				}
				g = g.resize(req.query.size, req.query.size);
			}

			if (req.query.quality !== undefined) {
				if (g === null) {
					g = gm(`${config.storagePath}/${path}`);
				}
				g = g.compress('jpeg')
					.quality(req.query.quality);
			}

			if (g !== null) {
				g.toBuffer('jpeg', (err: Error, img: Buffer) => {
					if (err !== undefined && err !== null) {
						console.error(err);
						res.status(500).send(err);
						return;
					}
					res.header('Content-Type', 'image/jpeg');
					res.send(img);
				});
			} else {
				res.sendFile(filePath);
			}
		} else if (err.code === 'ENOENT') {
			res.status(404).sendFile(__dirname + '/images/not-found.png');
		} else {
			res.sendStatus(500);
		}
	});
});

let server: http.Server | https.Server;
let port: number;

if (config.https.enable) {
	port = config.port.https;
	server = https.createServer({
		key: fs.readFileSync(config.https.keyPath),
		cert: fs.readFileSync(config.https.certPath)
	}, app);

	http.createServer((req, res) => {
		res.writeHead(301, {
			Location: config.url + req.url
		});
		res.end();
	}).listen(config.port.http);
} else {
	port = config.port.http;
	server = http.createServer(app);
}

server.listen(port, () => {
	const listenhost = server.address().address;
	const listenport = server.address().port;

	console.log(
		`\u001b[1;32m${cluster.worker.id} is now listening at ${listenhost}:${listenport}\u001b[0m`);
});
