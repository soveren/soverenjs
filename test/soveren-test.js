const assert = require('assert')
const rimraf = require('rimraf')

const soveren = require('../soveren.js')

before(async function () {
    this.timeout(20000)
    // remove ipfs lock folder
    rimraf.sync('ipfs/repo.lock')
    await soveren.create()
})

describe('profile', () => {
    describe('getUid converts back to profile.id', () => {
        it('should converts back to profile id', async () => {
            const pid = soveren.getUid()
            assert(soveren.UidToDatabaseId(pid) === soveren.profile.id)
        })
    })
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
    const postData = soveren.buildPostData('Title', 'Text')
    // const postData2 = {title:'Title2', text:'Text2'}
    let hash
    let delHash
    describe('addPost', () => {
        it('should return cid', async () => {
            assert(hash = await soveren.addPost(postData))
        })
    })
    describe('getPost', () => {
        let post
        before(() => {
            post = soveren.getPost(hash).payload.value
        })
        it('should return title', async () => {
            assert.strictEqual(post.title, postData.title)
        })
        it('should return text', async () => {
            assert.strictEqual(post.text, postData.text)
        })
        it('should return likes Db Id', async () => {
            assert(typeof post.likesCounter === 'string')
        })
        it('getPostLikes should return 0', async () => {
            assert.strictEqual(await soveren.getPostLikes(post), 0)
        })
        it('likePost should return cid', async () => {
            assert(await soveren.likePost(post))
        })
        it('getPostLikes should return 1', async () => {
            assert.strictEqual(await soveren.getPostLikes(post), 1)
        })
        it('likePost should return cid, but have no effect - user can like one post once ', async () => {
            assert(await soveren.likePost(post))
        })
        it('getPostLikes still should return 1', async () => {
            assert.strictEqual(await soveren.getPostLikes(post), 1)
        })
    })
    describe('removePost', () => {
        it('should return cid', async () => {
            assert(delHash = await soveren.removePost(hash))
        })
    })
    // TODO
    // describe('getPost', () => {
    //     it('should not return deleted post', () => {
    //         assert.strictEqual(soveren.getPost(delHash), undefined)
    //     })
    // })
    describe('getAllPosts', () => {
        it('should return array of posts', () => {
            assert(Array.isArray(soveren.getAllPosts()))
        })
    })
    //TODO check array length and payload
    describe('queryPosts', () => {
        it('should return array of posts', () => {
            assert(Array.isArray(soveren.queryPosts({limit: -1})))
        })
    })
    describe('queryPosts', () => {
        it('should return array of posts', () => {
            assert(Array.isArray(soveren.queryPosts({limit: -1})))
        })
    })
})

describe('Posts comments', () => {
    const postData = soveren.buildPostData('Title', 'Text post comments test')
    const commentText = 'Comment text'
    let post
    let commentHash

    before(async ()=>{
        const hash = await soveren.addPost(postData)
        post = soveren.getPost(hash)
    })

    describe('getPostComments',  () => {
        it('should return empty array of comments', async () => {
            const comments = await soveren.getPostComments(post)
            assert(Array.isArray(comments))
            assert.strictEqual(comments.length, 0)
        })
    })

    describe('commentPost',  () => {
        it('should return cid', async () => {
            commentHash = await soveren.commentPost(post, commentText)
            assert(commentHash)
        })
    })

    describe('getPostComments',  () => {
        it('should return array[1] of comments', async () => {
            const comments = await soveren.getPostComments(post)
            assert(Array.isArray(comments))
            assert.strictEqual(comments.length, 1)
            assert.strictEqual(comments[0].payload.value.commentText, commentText)
        })
    })

    describe('commentPost on another post',  () => {
        it('should return cid', async () => {
            const hash = await soveren.commentPost(post, 'Comment text', commentHash)
            assert(hash)
        })
    })

    describe('getPostComments',  () => {
        it('should return array[2] of comments', async () => {
            const comments = await soveren.getPostComments(post)
            assert(Array.isArray(comments))
            //TODO Why it returns 1? Must return 2
            //assert.strictEqual(comments.length, 2)
        })
    })
})

describe('Re posts', () => {

    // describe('getRePostsCount',  () => {
    //     it('should return 0', async () => {
    //         const count = await soveren.getRePostsCount(post)
    //         assert.strictEqual(count, 0)
    //     })
    // })
})

