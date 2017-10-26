import { debug } from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import { logger } from '../../logger';
import { DependenciesEngine } from './dependencies.engine';
import { Configuration } from '../configuration';
import { ConfigurationInterface } from '../interfaces/configuration.interface';
import { FileEngine } from './file.engine';
import { ExportData } from '../interfaces/export-data.interface';

const lunr: any = require('lunr');
const cheerio: any = require('cheerio');
const Entities: any = require('html-entities').AllHtmlEntities;
const Html = new Entities();

export class ExportEngine {
    constructor(
        private configuration: ConfigurationInterface,
        dependenciesEngine: DependenciesEngine,
        private fileEngine: FileEngine = new FileEngine()) {}

        private ExportHtmlContent: string = `
        <h1>Building Export functionality</h1>
        I am using a single model and 3 different configurations to obtain the results listed below:
        <br>
        XML, JSON and DOT
        <style>
        .OuterItem { color: dark-green;  font-weight: bold; }
        .InnerItem { color: maroon;  font-weight: bold; }

        .OuterOppeningPrefix  { color: red; font-weight: bold; }
        .OuterClosingSufix { color: red }
        .OuterClosingPrefix { color: red }

        .InnerOppeningPrefix { color: blue }
        .OuterOppeningSufix { color: blue }
        .InnerOppeningSufix { color: blue }

        .InnerClosingPrefix { color: blue }
        .InnerClosingSufix { color: blue }
        </style>

        <h1>EXPORT XML:</h1>
        <a href='exported_xml.txt' target='_blank'>Open unformated XML in a new window</a>
        <br><pre>XML_PLACEHOLDER</pre>

        <h1>EXPORT JSON:</h1><br>
        <a href='exported_json.txt' target='_blank'>Open unformated JSON in a new window</a>
        <pre>JSON_PLACEHOLDER</pre>

        <h1>EXPORT DOT:</h1> (for Graphviz or other diagram generator that is using DOT language) <br>
        <a href='exported_dot.txt' target='_blank'>Open unformated DOT in a new window</a>
        <pre>DOT_PLACEHOLDER</pre>');
    `;

    public exportAllFormats(data, configuration) {
        return new Promise((resolve, reject) => {
			const exportHelper = new ExportHelper();
			exportHelper.data_structure = data;
	        this.saveExportFile(JSON.stringify(data), configuration, 'data.json');

	        // Export individual text files
	        const exported_json    = exportHelper.GetJSON('default', false);
	        const exported_xml     = exportHelper.GetXML('default', false);
			const exported_dot     = exportHelper.GetDOT('default', false);

	        this.saveExportFile(exported_json, configuration, 'exported_json.txt');
	        this.saveExportFile(exported_xml, configuration, 'exported_xml.txt');
	        this.saveExportFile(exported_dot, configuration, 'exported_dot.txt');

	        const exported_json_colorixed    = exportHelper.GetJSON('default', true)
	            .replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\!%#/g, '<').replace(/\#%!/g, '>').trim();
	        const exported_xml_colorixed    = exportHelper.GetXML('default', true)
	            .replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\!%#/g, '<').replace(/\#%!/g, '>').trim();
	        const exported_dot_colorixed     = exportHelper.GetDOT('default', true)
				.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\!%#/g, '<').replace(/\#%!/g, '>').trim();

	        let exported_html = this.ExportHtmlContent
	            .replace('JSON_PLACEHOLDER', exported_json_colorixed)
	            .replace('XML_PLACEHOLDER', exported_xml_colorixed)
	            .replace('DOT_PLACEHOLDER', exported_dot_colorixed);
			this.saveExportFile(exported_html, configuration, 'exported.html');
			return true;
		});
    }

    public saveExportFile(data, configuration, filename) {
        return new Promise((resolve, reject) => {
            let testOutputDir = configuration.mainData.output.match(process.cwd());
            if (!testOutputDir) {
                configuration.mainData.output = configuration.mainData.output.replace(process.cwd(), '');
            }
            return this.fileEngine.write(configuration.mainData.output + path.sep + '/' + filename, data)
                .catch(err => {
                    logger.error('Error during structure file generation ', err);
                    return Promise.reject(err);
                });
        });
    }

    public processDataStructure(dependenciesEngine, configuration) {
        return new Promise((resolve, reject) => {
			const data_structure = {
				Name : 'App',
				Children :
				[
					{
						Type: 'Modules',
						Elements: []
					},
					{
						Type: 'Directives',
						Elements: []
					},
					{
						Type: 'Injectables',
						Elements: []
					},
					{
						Type: 'Routes',
						Elements: []
					},
					{
						Type: 'Pipes',
						Elements: []
					},
					{
						Type: 'Classes',
						Elements: []
					},
					{
						Type: 'Components',
						Elements: []
					},
					{
						Type: 'Interfaces',
						Elements: []
					}
					/*Miscellaneous:{
						Variables: [],
	                    Functions: [],
	                    Typealiases: [],
	                    Enumerations: []
					 }*/
				]
			};

			const providersSignature = 'Providders';
			const bootstrapsSignature = 'Bootstraps';
			const declarationsSignature = 'Declarations';
			const exportsSignature = 'Exports';
			const importsSignature = 'Imports';
			const propertiesSignature = 'Properties';
			const methodsSignature = 'Methods';
			const indexesSignature = 'Indexes';

            if (dependenciesEngine.modules.length > 0) {
                logger.info('... modules');
                const modules = dependenciesEngine.getModules();
                for(let moduleNr = 0; moduleNr < modules.length; moduleNr++) {

					const moduleElement = {
						Name : modules[moduleNr].name,
						Children :
						[
							{
								Type :'Providers',
								Elements : []
							},
							{
								Type :'Declarations',
								Elements : []
							},
							{
								Type :'Imports',
								Elements : []
							},
							{
								Type :'Exports',
								Elements : []
							},
							{
								Type :'Bootstrap',
								Elements : []
							},
							{
								Type :'Classes',
								Elements : []
							}
						]
					};

                    for(let k = 0; k < modules[moduleNr].providers.length; k++) {
						const providerElement = {
							Name : modules[moduleNr].providers[k].name
						};
						moduleElement.Children[0].Elements.push(providerElement);
                    }
                    for(let k = 0; k < modules[moduleNr].declarations.length; k++) {
						const declarationElement = {
							Name : modules[moduleNr].declarations[k].name
						};
						moduleElement.Children[1].Elements.push(declarationElement);
                    }
                    for(let k = 0; k < modules[moduleNr].imports.length; k++) {
						const importElement = {
							Name : modules[moduleNr].imports[k].name
						};
						moduleElement.Children[2].Elements.push(importElement);
                    }
                    for(let k = 0; k < modules[moduleNr].exports.length; k++) {
						const exportElement = {
							Name : modules[moduleNr].exports[k].name
						};
						moduleElement.Children[3].Elements.push(exportElement);
                    }
                    for(let k = 0; k < modules[moduleNr].bootstrap.length; k++) {
						const bootstrapElement = {
							Name : modules[moduleNr].bootstrap[k].name
						};
						moduleElement.Children[4].Elements.push(bootstrapElement);
                    }
					data_structure.Children[0].Elements.push(moduleElement);
                }
            }

            logger.info('... directives');
            if (dependenciesEngine.directives.length > 0) {
                const directives = dependenciesEngine.getDirectives();
                for(let k = 0; k < directives.length; k++) {
					const directiveElement = {
						Name : directives[k].name
					};
					data_structure.Children[1].Elements.push(directiveElement);
                }
            }

            logger.info('... injectables');
            if (dependenciesEngine.injectables.length > 0) {
                const injectables = dependenciesEngine.getInjectables();
                for(let k = 0; k < injectables.length; k++) {
					const injectableElement = {
						Name : injectables[k].name
					};
					data_structure.Children[2].Elements.push(injectableElement);
                }
            }

            logger.info('... routes');
            if (dependenciesEngine.routes && dependenciesEngine.routes.children.length > 0) {
                const routes = dependenciesEngine.getRoutes();
                for(let k = 0; k < routes.length; k++) {
					const routeElement = {
						Name : routes[k].name
					};
					data_structure.Children[3].Elements.push(routeElement);
                }
            }

            logger.info('... pipes');
            if (dependenciesEngine.pipes.length > 0) {
                const pipes = dependenciesEngine.getPipes();
                for(let k = 0; k < pipes.length; k++) {
					const pipeElement = {
						Name : pipes[k].name
					};
					data_structure.Children[4].Elements.push(pipeElement);
                }
            }

            logger.info('... classes');
            if (dependenciesEngine.classes.length > 0) {
                const classes = dependenciesEngine.getClasses();
                for(let k = 0; k < classes.length; k++) {
					const classElement = {
						Name : classes[k].name,
						Children :
						[
							{
								Type :'Properties',
								Elements : []
							},
							{
								Type :'Methods',
								Elements : []
							},
							{
								Type :'Indexes',
								Elements : []
							}
						]
					};

                    // logger.info('class properties');
                    for(let p = 0; p < classes[k].properties.length; p++) {
                        const propertyElement = {
                                'Name': classes[k].properties[p].name,
                                'DefaultValue': classes[k].properties[p].defaultValue,
                                'Type': classes[k].properties[p].type,
                                'Description': classes[k].properties[p].description,
								'Children' :[],
                        };
                        classElement.Children[0].Elements.push(propertyElement);
                    }
                    // logger.info('class methods');
                    for(let m = 0; m < classes[k].methods.length; m++) {
						const methodElement = {
							'Name' : classes[k].methods[m].name,
							'Returning' : 'string',
							'Children' : [],
							'Params' : [],
							'Type' : 'method'
						};
						classElement.Children[1].Elements.push(methodElement);
                    }
                    // logger.info('class indexSignatures');
                    for(let s = 0; s < classes[k].indexSignatures.length; s++) {
                        const indexElement = {
							Name : classes[k].indexSignatures[s].name,
						};
                        classElement.Children[2].Elements.push( indexElement );
                    }

					data_structure.Children[5].Elements.push(classElement);
                }
            }

            logger.info('... components');
            if (dependenciesEngine.components.length > 0) {
                const components = dependenciesEngine.getComponents();
                for(let k = 0; k < components.length; k++) {
					const componentElement = {
						Name : components[k].name,
					};
					data_structure.Children[6].Elements.push( componentElement );
                }
            }

			// logger.info('... interfaces');
	        this.saveExportFile(JSON.stringify(data_structure), configuration, 'data.json');
            if (dependenciesEngine.interfaces.length > 0) {
                const interfaces = dependenciesEngine.getInterfaces();
                for(let k = 0; k < interfaces.length; k++) {
					const interfaceElement = {
						Name : interfaces[k].name,
					};
					// data_structure.Children[7].Elements.push( interfaceElement );
                }
			}
			/*
            logger.info('... miscellaneous');
            if (dependenciesEngine.miscellaneous.variables.length > 0 ||
                dependenciesEngine.miscellaneous.functions.length > 0 ||
                dependenciesEngine.miscellaneous.typealiases.length > 0 ||
                dependenciesEngine.miscellaneous.enumerations.length > 0) {
                const miscellaneous = dependenciesEngine.getMiscellaneous();

                for(let k = 0; k < miscellaneous.variables.length; k++) {
                    // jsonData.miscellaneous.variables.push(miscellaneous.variables[k].name);
                }
                for(let k = 0; k < miscellaneous.functions.length; k++) {
                    jsonData.miscellaneous.functions.push(miscellaneous.functions[k].name);
                }
                for(let k = 0; k < miscellaneous.typealiases.length; k++) {
                    jsonData.miscellaneous.typealiases.push(miscellaneous.typealiases[k].name);
                }
                for(let k = 0; k < miscellaneous.enumerations.length; k++) {
                    jsonData.miscellaneous.Children[8].Elements.push(miscellaneous.enumerations[k].name);
                }
			}
			*/

			this.saveExportFile(JSON.stringify(data_structure), configuration, 'data.json');
			resolve(data_structure);
            return data_structure;
        });
    }
}


export class ExportHelper {

    private DEBUG: boolean = false;
    public data_structure: Array<any> = new Array();
    private breadcrumbs: Array<string> = new Array();
    private divCreated: boolean = false;
    private exportConfigurations =
    {
        'JSON' :[], 	// JSON - https://en.wikipedia.org/wiki/JSON
        'XML' :[], 	// Canonical XML - https://en.wikipedia.org/wiki/Canonical_XML
        'DOT' :[]		// DOT language	- https://en.wikipedia.org/wiki/DOT_(graph_description_language)
	};

	constructor () {
		this.AddConfigurations();
	}

    private AddConfigurations() {

        this.exportConfigurations.JSON.push
        (
        	{
        		Name :'default',
        		Type :'JSON',
        		Options :{
        			Decorators :
        			{
        				Collection :{
        					OppeningPrefix :'\'CollectionPlaceholder\' :[',
        					OppeningSufix :'',
        					ClosingPrefix :']',
        					ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :','
        				},
        				Item :{
        					OppeningPrefix :'{ \'',
        					OppeningSufix :'\' :{',
        					ClosingPrefix :'}}',
        					ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :','
        				}
        			},
        			'IdentLength' :3,
        			'IdentCharacters' :' ',
        			'Format' :'None'
        		},
        		Structure :	{ /* Configure export here */ }
        	}
        );

        this.exportConfigurations.XML.push
        (
        	{
        		Name :'default',
        		Type :'XML',
        		Options :{
        			Decorators :
        			{
        				Collection :{
        					OppeningPrefix :'<SanitizedCollectionPlaceholder>',
        					OppeningSufix :'',
        					ClosingPrefix :'</SanitizedCollectionPlaceholder>',
        					ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :','
        				},
        				Item :{
        					OppeningPrefix :'<Item name=\'',
        					OppeningSufix :'\'>',
        					ClosingPrefix :'</Item>',
        					ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :','
        				}
        			},
        			'IdentLength' :3,
        			'IdentCharacters' :' ',
        			'Format' :'None'
        		},
        		Structure :	{ /* Configure export here */ }
        	}
        );
        this.exportConfigurations.DOT.push
        (
        	{
        		Name :'default',
        		Type :'DOT',
        		Options :{
        			Decorators :
        			{
        				Collection :{
        					OppeningPrefix: 'subgraph cluster_SanitizedCollectionPlaceholder',
							OppeningSufix: '{ color=yellow; node [style=filled,color=white]; color=blue; ',
							ClosingPrefix: ' label = "CollectionPlaceholder"; }',
							ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :';'
        				},
        				Item :{
        					OppeningPrefix :'',
        					OppeningSufix :'',
        					ClosingPrefix :'',
        					ClosingSufix :'',
        					ItemIdent :1,
        					ChildrenIdent :0,
        					ItemIdentCharacter :' ',
        					ChildrenIdentCharacter :' ',
        					ItemStyle :'div',
        					ChildrenStyle :'span',
        					Separator :','
        				}
        			},
        			'IdentLength' :3,
        			'IdentCharacters' :' ',
        			'Format' :'None'
        		},
        		Structure :	{ /* Configure export here */ }
        	}
        );
    }
        /* Get the named profile. If the specified profile was not found, get the default profile.
        If the default profile was not defined return the first profile */
    private GetExportProfileByName(profileCollection, profileName = 'default') {
        let selectedProfile = undefined;
        let defaultProfile = undefined;
        	for(let i = 0; i < profileCollection.length; i++) {
        		if(profileCollection[i].Name === profileName) {
        			selectedProfile = profileCollection[i];
        			break;
        		}
        		if(profileCollection[i].Name === 'default') {
        			defaultProfile = profileCollection[i];
        		}
        	}
        	return (
                selectedProfile != undefined ?
                selectedProfile :
                ( defaultProfile != undefined ? defaultProfile : this.exportConfigurations[0] )
            ) ;
        }

        private MakeIdent(identBase, identLength, identCharacter) {
        	let tab = '';
        	if(identLength >= 0) {
        		for(let i = 0; i < identLength; i++) {
        			tab += identCharacter;
        		}
        		return identBase + tab;
        	} else {
        		return identBase.substr(0, identBase.length + identLength);
        	}
        }

		private ProcessElement(context: ExportProcessorContext) {

			let OuterDecorator;
			let InnerDecorator;
			let OuterDecoratorOppeningPrefix: string;
			let OuterDecoratorClosingPrefix: string;

			if(context.Profile !== undefined) {
				OuterDecorator = context.Options.Decorators[context.Profile.OuterDecorator];
				InnerDecorator = context.Options.Decorators[context.Profile.InnerDecorator];
			}
			if(OuterDecorator === undefined) {
				const CollectionIndex = 'Collection';
				OuterDecorator = context.Options.Decorators[CollectionIndex];
			}
			if(InnerDecorator === undefined) {
				const ItemIndex = 'Item';
				InnerDecorator = context.Options.Decorators[ItemIndex];
			}

			OuterDecoratorOppeningPrefix = OuterDecorator.OppeningPrefix
			.replace(/SanitizedCollectionPlaceholder/g, context.Structure.Name.replace(/\W/g, '_'))
			.replace(/CollectionPlaceholder/g, context.Structure.Name);
			OuterDecoratorClosingPrefix = OuterDecorator.ClosingPrefix
			.replace(/SanitizedCollectionPlaceholder/g, context.Structure.Name.replace(/\W/g, '_'))
			.replace(/CollectionPlaceholder/g, context.Structure.Name);

			let IdentString = '';
			let result: string = '';
			this.breadcrumbs[context.Level] = context.Structure.Name;
			if(this.DEBUG) { result += '-2'; }
			if(InnerDecorator.ItemStyle === 'div') {
				// result += '\n';
				IdentString = this.MakeIdent(
					context.IdentString, InnerDecorator.ItemIdent,
					InnerDecorator.ItemIdentCharacter);
				result += IdentString;
			}
			let tag = InnerDecorator.OppeningPrefix;
			if(this.breadcrumbs[context.Level-0]) {
				tag = tag.replace('${0}', this.breadcrumbs[context.Level-0].replace(/\W/g, '_'));
			}
			if(this.breadcrumbs[context.Level-1]) {
				tag = tag.replace('${1}', this.breadcrumbs[context.Level-1].replace(/\W/g, '_'));
			}
			result += (context.Colorized?'!%#span class="InnerOppeningPrefix"#%!':'') + tag + (context.Colorized?'!%#/span#%!':'');

			if(typeof(context.Structure.Name) !== 'undefined') {
				result += (context.Colorized?'!%#span class="InnerItem"#%!':'')
				+ context.Structure.Name
				+ (context.Colorized?'!%#/span#%!':'');
			}

			if(InnerDecorator.ChildrenStyle === 'div') {
				result += '\n';
				IdentString = this.MakeIdent(
					context.IdentString, InnerDecorator.ChildrenIdent,
					InnerDecorator.ChildrenIdentCharacter);
				result += IdentString;
			}
			result += (context.Colorized?'!%#span class="InnerOppeningSufix"#%!':'')
			+ InnerDecorator.OppeningSufix
			+ (context.Colorized?'!%#/span#%!':'');

			if(this.DEBUG) { result += '-1'; }

			if(context.Structure.Children !== undefined) {
				if(context.Structure.Children.length > 0) {
					result += '\n';
				}
				for(let k = 0; k < context.Structure.Children.length; k++) {
					const childContext = new ExportProcessorContext();
					childContext.Structure = context.Structure.Children[k];
					if(context.Profile !== undefined && context.Profile.Children !== undefined)	{
						// childContext.Profile = context.Profile.Children[k];
					}
					childContext.Options = context.Options;
					childContext.IdentString = IdentString;
					childContext.Level = context.Level+1;
					childContext.Colorized = context.Colorized;
					result += this.ProcessCollection(childContext);
				}
			}

			if(this.DEBUG) { result += '1'; }
			if(InnerDecorator.ChildrenStyle === 'div') {
				result += '\n';
				IdentString = this.MakeIdent( context.IdentString, -1 * (InnerDecorator.ChildrenIdent),
				InnerDecorator.ChildrenIdentCharacter);
				result += IdentString;
			}
			result += (context.Colorized?'!%#span class="InnerClosingPrefix"#%!':'')
			+ InnerDecorator.ClosingPrefix
			+ (context.Colorized?'!%#/span#%!':'');

			if(context.ElementsLeft > 0) {
				result += OuterDecorator.Separator;
			}
			if(InnerDecorator.ItemStyle === 'div') {
				result += '\n';
				IdentString = this.MakeIdent( context.IdentString, -1 * (InnerDecorator.ItemIdent),
				InnerDecorator.ItemIdentCharacter);
				if(context.ElementsLeft === 0) {
					result += IdentString;
				}
			}
			result += InnerDecorator.ClosingSufix;
			if(this.DEBUG) { result += '2'; }
			return result;
		}

		private ProcessCollection(context: ExportProcessorContext) {
        	let result = '';

			let OuterDecorator;
			let InnerDecorator;
			let OuterDecoratorOppeningPrefix: string;
			let OuterDecoratorClosingPrefix: string;

			if(context.Profile !== undefined) {
				OuterDecorator = context.Options.Decorators[context.Profile.OuterDecorator];
				InnerDecorator = context.Options.Decorators[context.Profile.InnerDecorator];
			}
			if(OuterDecorator === undefined) {
				const CollectionIndex = 'Collection';
				OuterDecorator = context.Options.Decorators[CollectionIndex];
			}
			if(InnerDecorator === undefined) {
				const ItemIndex = 'Item';
				InnerDecorator = context.Options.Decorators[ItemIndex];
			}

			OuterDecoratorOppeningPrefix = OuterDecorator.OppeningPrefix
			.replace(/SanitizedCollectionPlaceholder/g, context.Structure.Type.replace(/\W/g, '_'))
			.replace(/CollectionPlaceholder/g, context.Structure.Type);
			OuterDecoratorClosingPrefix = OuterDecorator.ClosingPrefix
			.replace(/SanitizedCollectionPlaceholder/g, context.Structure.Type.replace(/\W/g, '_'))
			.replace(/CollectionPlaceholder/g, context.Structure.Type);

        	let IdentString = '';
        	// if(context.Profile.OuterDecorator !== 'none') {
        		if(this.DEBUG) { result += '-4'; }
        		if(OuterDecorator.ItemStyle === 'div') {
        			IdentString = this.MakeIdent(
                        context.IdentString, OuterDecorator.ItemIdent,
                        InnerDecorator.ItemIdentCharacter);
        			result += IdentString;
        		}
                result += (context.Colorized?'!%#span class="OuterOppeningPrefix"#%!':'')
                + OuterDecoratorOppeningPrefix
                + (context.Colorized?'!%#/span#%!':'');

        		if(typeof(context.Structure.Name) !== 'undefined') {
        			result += context.Structure.Name;
        		}

        		if(OuterDecorator.ChildrenStyle === 'div') {
        			result += '\n';
        			IdentString = this.MakeIdent(
                        context.IdentString, OuterDecorator.ChildrenIdent,
                        InnerDecorator.ChildrenIdentCharacter);
        			result += IdentString;
        		}
                result += (context.Colorized?'!%#span class="OuterOppeningSufix"#%!':'')
                + OuterDecorator.OppeningSufix
                + (context.Colorized?'!%#/span#%!':'');
        		if(this.DEBUG) { result += '-3'; }
        	// }

			if(context.Structure.Elements.length > 0) {
				result += '\n';
			}
        	for(let i = 0; i < context.Structure.Elements.length; i++) {
				const childContext = new ExportProcessorContext();
				childContext.Colorized = context.Colorized;
				childContext.Options = context.Options;
				childContext.Profile = context.Profile;
				childContext.Level = context.Level;
				childContext.IdentBase = context.IdentBase;
				childContext.InnerDecorator = InnerDecorator;
				childContext.OuterDecorator = OuterDecorator;
				childContext.IdentString = IdentString + context.IdentString;
				childContext.Structure = context.Structure.Elements[i];
				childContext.ElementsLeft = context.Structure.Elements.length-1-i;
				result += this.ProcessElement(childContext);
        	}
        	// OuterDecorator
        	// if(context.Profile.OuterDecorator !== 'none') {
        		if(this.DEBUG) { result += '3'; }
        		if(OuterDecorator.ChildrenStyle === 'div') {
        			result += '\n';
                    IdentString = this.MakeIdent( context.IdentString, -1 * (OuterDecorator.ChildrenIdent),
                    InnerDecorator.ChildrenIdentCharacter);
        			result += IdentString;
        		}
                result += (context.Colorized?'!%#span class="OuterClosingPrefix"#%!':'')
                + OuterDecoratorClosingPrefix
                + (context.Colorized?'!%#/span#%!':'');
        		if(OuterDecorator.ItemStyle === 'div') {
        			result += '\n';
        			IdentString = this.MakeIdent( context.IdentString, -1 * (OuterDecorator.ItemIdent),
                        InnerDecorator.ItemIdentCharacter);
        			result += IdentString;
        		}
                result += (context.Colorized?'!%#span class="OuterClosingSufix"#%!':'')
                + OuterDecorator.ClosingSufix
                + (context.Colorized?'!%#/span#%!':'');
        		if(this.DEBUG) { result += '4'; }
        	// }
        	return result;
        }

        public GetXML(profileName: string, colorized: boolean) {
        	let output = '';
			const profile = this.GetExportProfileByName(this.exportConfigurations.XML, profileName);
			const exportProcessorContext = new ExportProcessorContext();
			exportProcessorContext.Structure = this.data_structure;
			exportProcessorContext.Profile = profile.Structure;
			exportProcessorContext.Options = profile.Options;
			exportProcessorContext.IdentBase = '';
			exportProcessorContext.Level = 0;
			exportProcessorContext.Colorized = colorized;
			output = this.ProcessElement(exportProcessorContext);
			// this.data_structure, profile.Structure, profile.Options, '', 0, colorized);
        	return output;
        }

        public GetDOT(profileName: string, colorized: boolean) {
        	let output = '';
        	const profile = this.GetExportProfileByName(this.exportConfigurations.DOT, profileName);
			const exportProcessorContext = new ExportProcessorContext();
			exportProcessorContext.Structure = this.data_structure;
			exportProcessorContext.Profile = profile.Structure;
			exportProcessorContext.Options = profile.Options;
			exportProcessorContext.IdentBase = '';
			exportProcessorContext.Level = 0;
			exportProcessorContext.Colorized = colorized;
			output = this.ProcessElement(exportProcessorContext);
        	return 'digraph G{ ' + output + ' }';
        }

        public GetJSON(profileName: string, colorized: boolean) {
        	let output = '';
        	const profile = this.GetExportProfileByName(this.exportConfigurations.JSON, profileName);
			const exportProcessorContext = new ExportProcessorContext();
			exportProcessorContext.Structure = this.data_structure;
			exportProcessorContext.Profile = profile.Structure;
			exportProcessorContext.Options = profile.Options;
			exportProcessorContext.Colorized = colorized;
			output = this.ProcessElement(exportProcessorContext);
        	return '{' + output + '}';
        }
	}

class ExportProcessorContext {
	public Structure: any;
	public Profile: any;
	public Options: any;
	// Current ident
	public IdentBase: string = '';
	// Level in depth used to create identation
	public Level: number = 0;
	// Use HTML spans
	public Colorized: boolean = false;
	public InnerDecorator: any;
	public OuterDecorator: any;
	// Used to add separators in case is not last element
	public ElementsLeft: number;
	public IdentString = '';
}
