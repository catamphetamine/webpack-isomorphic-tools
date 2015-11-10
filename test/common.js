import chai from 'chai'
import { extend, normalize_asset_path } from './../source/common'

import path from 'path'

chai.should()

describe('common functions', function()
{
	it('should normalize asset paths', function()
	{
		const project_folder = path.join(__dirname, 'project')

		normalize_asset_path(path.join(project_folder, 'folder/file.txt'), project_folder).should.equal('./folder/file.txt')
		// normalize_asset_path(path.join(project_folder, '../another/folder/file.txt'), project_folder).should.equal(path.join(project_folder, '../another/folder/file.txt'))
		normalize_asset_path(path.join(project_folder, '../another/folder/file.txt'), project_folder).should.equal('../another/folder/file.txt')
	})
})