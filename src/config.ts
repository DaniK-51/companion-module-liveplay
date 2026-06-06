import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	connectionTimeout: number
	debugLogging: boolean
	updateInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'LivePlay Server IP',
			default: '127.0.0.1',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			default: 4480,
			min: 1,
			max: 65535,
			width: 4,
		},
		{
			type: 'number',
			id: 'connectionTimeout',
			label: 'Connection Timeout (ms)',
			default: 5000,
			min: 1000,
			max: 30000,
			width: 6,
		},
		{
			type: 'checkbox',
			id: 'debugLogging',
			label: 'Debug Logging',
			default: false,
			width: 6,
		},
		{
			type: 'number',
			id: 'updateInterval',
			label: 'Update Interval (ms)',
			default: 100,
			min: 50,
			max: 1000,
			width: 6,
		},
	]
}
