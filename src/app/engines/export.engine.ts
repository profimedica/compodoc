import * as path from 'path';

import { logger } from '../../logger';
import { DependenciesEngine } from './dependencies.engine';
import { ConfigurationInterface } from '../interfaces/configuration.interface';
import { FileEngine } from './file.engine';

import { ExportData } from '../interfaces/export-data.interface';

// const CircularJSON = require('circular-json');

export class ExportEngine {

	private export(outputFolder, data) {}

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

    constructor(
        configuration: ConfigurationInterface,
        dependenciesEngine: DependenciesEngine,
        private fileEngine: FileEngine = new FileEngine()) {
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
	public IdentString: any;
	public OuterDecorator: any;
	public ElementsLeft: number;
	// Used to add separators in case is not last element
}
