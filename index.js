const { modifyNodes } = require('reshape-plugin-util')
const fs = require('fs');
const path = require('path');

/** Requires a filename option to be passed to reshape */
module.exports = function reshapeAutolink(options = {}) {
	const templateBaseDir = options.templateBaseDir;

	const settings = {
		script: {
			dir: options.script.dir,
			prefix: options.script.prefix || '/',
			searchExtensions: options.script.searchExtensions || ['js', 'jsx', 'ts', 'tsx'],
			outputExtension: options.script.outputExtension
		},
		
		style: {
			dir: options.style.dir,
			prefix: options.style.prefix || '/',
			searchExtensions: options.style.searchExtensions || ['css', 'scss', 'sass'],
			outputExtension: options.style.outputExtension
		}
	}

	function log(msg) {
		if (options.verbose) {
			console.log(msg);
		}
	}

	function removeExtension(path) {
		return path.substring(0, path.lastIndexOf('.'));
	}

	return function (tree, opts) {
		return modifyNodes(
			tree,
			node => node.type === 'tag' && node.name === 'head',
			node => {
				//XXX this should be DRYed (identical blocks, different paramter names and node push code)
				
				if (!opts.filename) {
					throw new Error('This plugin needs a "filename" option to work'); //TODO document
				}

				//Absolute template path
				const templateFilePath = path.parse(opts.filename);

				//Name of the template (relative to the base dir if it exists)
				const templateName = templateBaseDir ? removeExtension(path.relative(templateBaseDir, path.resolve(templateBaseDir, opts.filename))) : templateFilePath.name;
				
				
				function autolink(type, options, linker) {
					//Base path of a potential linkfile
					const basePath = path.resolve(options.dir, templateName);

					//The first extension for which a corresponding linkfile exists
					const foundExtension = options.searchExtensions.find(extension => fs.existsSync(`${basePath}.${extension}`));

					if (!foundExtension) {
						log(`Did not find ${type} for ${templateName} in ${basePath}`);
					} else {
						const linkPath = path.relative(options.dir, `${basePath}.${options.outputExtension || foundExtension}`);
						log(`Found ${type} for ${templateName}: ${linkPath}`);
						node.content.push(linker(linkPath));
					}
				}
				
				
				autolink('script', settings.script, path => (
					{
						type: 'tag',
						name: 'script',
						content: [],
						attrs: {
							src: [{ type: 'text', content: settings.script.prefix + path }],
							defer: [{ type: 'text', content: '' }]
						},
						location: {}
					}
				));
				
				autolink('styles', settings.style, path => (
					{
						type: 'tag',
						name: 'link',
						content: [],
						attrs: {
							rel: [{ type: 'text', content: 'stylesheet' }],
							href: [{ type: 'text', content: settings.style.prefix + path }]
						},
						location: {}
					}
				));

				
				log('');
				return node;
			}
		)
	}
}
