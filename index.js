const { modifyNodes } = require('reshape-plugin-util')
const fs = require('fs');
const path = require('path');

/** Requires a filename option to be passed to reshape */
module.exports = function reshapeAutolink(options = {}) {
	const templateBaseDir = options.templateBaseDir;

	const scriptDir = options.scriptDir;
	const scriptPrefix = options.scriptPrefix || '/';
	const scriptExtensions = options.scriptExtensions || ['js', 'jsx', 'ts', 'tsx'];
	const scriptOutputExtension = options.scriptOutputExtension === undefined ? 'js' : options.scriptOutputExtension; //null is allowed to signal 'keep'

	const styleDir = options.styleDir;
	const stylePrefix = options.stylePrefix || '/';
	const styleExtensions = options.styleExtensions || ['css', 'scss'];
	const styleOutputExtension = options.styleOutputExtension === undefined ? 'css' : options.styleOutputExtension; //null is allowed to signal 'keep'


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
				
				
				function autolink(type, dir, extensions, outputExtension, linker) {
					//Base path of a potential linkfile
					const basePath = path.resolve(dir, templateName);

					//The first extension for which a corresponding linkfile exists
					const foundExtension = extensions.find(extension => fs.existsSync(`${basePath}.${extension}`));

					if (!foundExtension) {
						log(`Did not find ${type} for ${templateName} in ${basePath}`);
					} else {
						const linkPath = path.relative(dir, `${basePath}.${outputExtension || foundExtension}`);
						log(`Found ${type} for ${templateName}: ${linkPath}`);
						node.content.push(linker(linkPath));
					}
				}
				
				
				autolink('script', scriptDir, scriptExtensions, scriptOutputExtension, path => (
					{
						type: 'tag',
						name: 'script',
						content: [],
						attrs: {
							src: [{ type: 'text', content: scriptPrefix + path }],
							defer: [{ type: 'text', content: '' }]
						},
						location: {}
					}
				));
				
				autolink('styles', styleDir, styleExtensions, styleOutputExtension, path => (
					{
						type: 'tag',
						name: 'link',
						content: [],
						attrs: {
							rel: [{ type: 'text', content: 'stylesheet' }],
							href: [{ type: 'text', content: stylePrefix + path }]
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
