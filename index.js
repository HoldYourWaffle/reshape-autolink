const { modifyNodes } = require('reshape-plugin-util')
const fs = require('fs');
const path = require('path');

/** Requires a filename option to be passed to reshape */
module.exports = function reshapeAutolink(options = {}) {
	//XXX can the basedir be resolved in the pre-processor? (compiler context)
	const templateBaseDir = options.templateBaseDir;

	const scriptDir = options.scriptDir;
	const scriptPrefix = options.scriptPrefix || '/';
	const scriptExtensions = options.scriptExtensions || ['js', 'jsx', 'ts', 'tsx'];

	const styleDir = options.styleDir;
	const stylePrefix = options.stylePrefix || '/';
	const styleExtensions = options.styleExtensions || ['css', 'scss'];


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



				//Base path of a potential script file
				const baseScriptPath = path.resolve(scriptDir, templateName);

				//The first extension for which a corresponding script file exists
				const foundScriptExtension = scriptExtensions.find(extension => fs.existsSync(`${baseScriptPath}.${extension}`));

				if (!foundScriptExtension) {
					log(`Did not find script for ${templateName} in ${baseScriptPath}`);
				} else {
					const scriptPath = path.relative(scriptDir, `${baseScriptPath}.${foundScriptExtension}`);
					log(`Found script for ${templateName}: ${scriptPath}`);

					node.content.push({
						type: 'tag',
						name: 'script',
						content: [],
						attrs: {
							src: [{ type: 'text', content: scriptPrefix + scriptPath }],
							defer: [{ type: 'text', content: '' }]
						},
						location: {}
					});
				}




				//Base path of a potential style file
				const baseStylePath = path.resolve(styleDir, templateName);

				//The first extension for which a corresponding style file exists
				const foundStyleExtension = styleExtensions.find(extension => fs.existsSync(`${baseStylePath}.${extension}`));

				if (!foundStyleExtension) {
					log(`Did not find styles for ${templateName} in ${baseStylePath}`);
				} else {
					const stylePath = path.relative(styleDir, `${baseStylePath}.${foundStyleExtension}`);
					log(`Found styles for ${templateName}: ${stylePath}`);

					node.content.push({
						type: 'tag',
						name: 'link',
						content: [],
						attrs: {
							rel: [{ type: 'text', content: 'stylesheet' }],
							href: [{ type: 'text', content: stylePrefix + stylePath }]
						},
						location: {}
					});
				}



				log('');
				return node;
			}
		)
	}
}
