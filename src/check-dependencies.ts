import {logInfo, logDone, logWarn} from 'log-cool';
import {exec} from 'shelljs';

export default function(): void {
	checkDependency('Node.js', 'node -v', x => x.match(/^v(.*)\r?\n$/)[1]);
	checkDependency('npm', 'npm -v', x => x.match(/^(.*)\r?\n$/)[1]);
	checkDependency('gm', 'gm -version', x => x.match(/^GraphicsMagick\s(.*?)\s/)[1]);
	checkDependency('MongoDB', 'mongo --version', x => x.match(/^MongoDB shell version: (.*)\r?\n$/)[1]);
	logDone('Checked external dependencies');
}

function checkDependency(serviceName: string, command: string, transform: (x: string) => string): void {
	const code = {
		success: 0,
		notFound: 127
	};
	const x = <any>exec(command, { silent: true });
	if (x.code === code.success) {
		logInfo(`${serviceName} ${transform(x.stdout)}`);
	} else if (x.code === code.notFound) {
		logWarn(`Unable to find ${serviceName}`);
	}
}
