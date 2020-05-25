const assert = require('assert')

const soveren = require('../soveren.js')

before(async function () {
    this.timeout(10000)
    await soveren.create()
})

describe('profile', () => {
    describe('setProfileField name John', () => {
        it('should return cid', async () => {
            assert(await soveren.setProfileField('name','John'))
        })
    })
    describe('getProfileField name', () => {
        it('should return John', async () => {
            assert.strictEqual(soveren.getProfileField('name'),'John')
        })
    })
    describe('deleteProfileField name', () => {
        it('should return John', async () => {
            assert(await soveren.deleteProfileField('name'))
        })
    })
    describe('getProfileField name', () => {
        it('should return undefined (after delete)', async () => {
            assert.strictEqual(soveren.getProfileField('name'), undefined)
        })
    })
    describe('setProfileFields name, age', () => {
        it('should return object', async () => {
            assert(typeof await soveren.setProfileFields({name:'Alex',age:23}) === 'object')
        })
    })
    describe('getProfileField', () => {
        it('name should be John', async () => {
            assert.strictEqual(await soveren.getProfileField('name'),'Alex')
        })
        it('age should be 23', async () => {
            assert.strictEqual(await soveren.getProfileField('age'),23)
        })
    })
    describe('setProfileFields email, age', () => {
        it('should return object', async () => {
            assert(typeof await soveren.setProfileFields({email:'alex@domain.io',age:24}) === 'object')
        })
    })
    describe('getProfileFields', () => {
        it('email should be alex@domain.io', async () => {
            assert.strictEqual(await soveren.getProfileFields()['email'],'alex@domain.io')
        })
        it('age should be 24', async () => {
            assert.strictEqual(await soveren.getProfileFields()['age'],24)
        })
    })
})

describe('following', () => {
    const uid = '0xTESTuid555'
    describe('follow uid', () => {
        it('should return cid', async () => {
            assert(await soveren.follow(uid))
        })
    })
    describe('getFollowing', () => {
        it('should have uid in response', async () => {
            assert.strictEqual(soveren.getFollowing()[uid], uid)
        })
    })
    describe('unFollow uid', () => {
        it('should return John', async () => {
            assert(await soveren.unFollow(uid))
        })
    })
    describe('getFollowing', () => {
        it('should have no uid in response', async () => {
            assert.strictEqual(soveren.getFollowing()[uid], undefined)
        })
    })
})

describe('posts', () => {
    const postData = {title:'Title',   text:'Text'}
    // const postData2 = {title:'Title2', text:'Text2'}
    let hash
    let delHash
    describe('addPost', () => {
        it('should return cid', async () => {
            assert(hash = await soveren.addPost(postData))
        })
    })
    describe('getPost', () => {
        it('should return title', async () => {
            assert.strictEqual(soveren.getPost(hash).payload.value.title, postData.title)
        })
        it('should return text', async () => {
            assert.strictEqual(soveren.getPost(hash).payload.value.text, postData.text)
        })
    })
    describe('removePost', () => {
        it('should return cid', async () => {
            assert(delHash = await soveren.removePost(hash))
        })
    })
    describe('getPost', () => {
        it('should not return deleted post', async () => {
            assert.strictEqual(soveren.getPost(delHash), undefined)
        })
    })
    describe('getAllPosts', () => {
        it('should return array of posts', async () => {
            assert(Array.isArray(soveren.getAllPosts()))
        })
    })
    //TODO check array length and payload
    describe('queryPosts', () => {
        it('should return array of posts', async () => {
            assert(Array.isArray(soveren.queryPosts({ limit: -1 })))
        })
    })
})


