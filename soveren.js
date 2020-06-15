'use strict'



class Freedom {
    /**
     * Constructs Freedom object
     * @param IPFS
     * @param OrbitDB
     * @param ipfsRepo path to the local IPFS repository
     */
    constructor(IPFS, OrbitDB, ipfsRepo = './ipfs') {
        this.IPFS = IPFS
        this.OrbitDB = OrbitDB
        this.ipfsRepo = ipfsRepo
    }

    /**
     * Creates and initializes Freedom node
     * @returns {Promise<Object>}
     */
    async create() {
        if (this.created) return true
        try {
            this.ipfs = await this.IPFS.create({
                preload: {enabled: false},
                repo: this.ipfsRepo,
                EXPERIMENTAL: {pubsub: true},
                config: {
                    Bootstrap: [],
                    Addresses: {Swarm: []},
                },
            })

            // this.node.on('error', (e) => { throw (e) })
            // this.node.on('ready', this._init.bind(this))

            await this.ipfs.start();

            this.orbitdb = await this.OrbitDB.createInstance(this.ipfs)
            this.defaultDbOptions = {write: [this.orbitdb.identity.id]}
            // console.log('orbitdb', this.orbitdb.id, this.orbitdb.id.length)
            this.created = true

            return this
        } catch (e) {
            throw (e)
        }
    }

    /**
     * Call affirm instead of create
     * @returns {Promise<Object>}
     */
    async affirm() {
        if (!this.created) return this.create()
    }

}

class Soveren {
    /**
     * Constructs Soveren object
     * @param freedom object
     */
    constructor(freedom) {
        this.freedom = freedom
    }

    uuid() { // Public Domain/MIT
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    async loadFixtureData(fixtureData) {
        const fixtureKeys = Object.keys(fixtureData)
        for (let i in fixtureKeys) {
            let key = fixtureKeys[i]
            if (!this.profile.get(key)) await this.profile.set(key, fixtureData[key])
        }
    }

    getTimestamp() {
        return new Date().getTime()
    }

    /**
     * Creates and initializes Soveren node
     * @returns {Promise<Object>}
     */
    async create(uid = undefined) {
        try {
            await this.freedom.affirm()
            this.ipfs = this.freedom.ipfs
            this.orbitdb = this.freedom.orbitdb
            this.defaultDbOptions = this.freedom.defaultDbOptions

            const db = this.orbitdb
            if (uid) { // create for another user

                this.profile = await db.kvstore(this.UidToDatabaseId(uid), this.defaultDbOptions)
                await this.profile.load()

                this.following = await db.kvstore(this.getProfileField('following'), this.defaultDbOptions)
                await this.following.load()

                this.posts = await db.feed(this.getProfileField('posts'), this.defaultDbOptions)
                await this.posts.load()

            } else { // create for yourself

                this.profile = await db.kvstore('profile', this.defaultDbOptions)
                await this.profile.load()

                this.following = await db.kvstore('following', this.defaultDbOptions)
                await this.following.load()

                this.posts = await db.feed('posts', this.defaultDbOptions)
                await this.posts.load()

            }
            // Apply fixture data
            const peerInfo = await this.freedom.ipfs.id()
            await this.loadFixtureData({
                'username': 'User' + Math.floor(Math.random() * 1000000),
                'following': this.following.id,
                'posts': this.posts.id,
                'nodeId': peerInfo.id,
            })
            return this
        } catch (e) {
            throw (e)
        }
    }

    /**
     * Returns current user id
     * @returns {string} current profile id
     */
    getUid() {
        return this.databaseIdToUid(this.profile.id)
    }

    /**
     * Warps user id to full orbitDB database id
     * @param {string} uid i.e. zdpuAxEFHh6GMHzfXNwbxMSAgSUtHSZMdxVqyYcWb659SnEX8
     * @returns {string} database id i.e. /orbitdb/zdpuAxEFHh6GMHzfXNwbxMSAgSUtHSZMdxVqyYcWb659SnEX8/profile
     */
    UidToDatabaseId(uid) {
        return `/orbitdb/${uid}/profile`
    }

    /**
     * Shortens orbitDB database id to user id (uid)
     * @param {string} databaseId i.e. /orbitdb/zdpuAxEFHh6GMHzfXNwbxMSAgSUtHSZMdxVqyYcWb659SnEX8/profile
     * @returns {string} profileId zdpuAxEFHh6GMHzfXNwbxMSAgSUtHSZMdxVqyYcWb659SnEX8
     */
    databaseIdToUid(databaseId) {
        return databaseId.split('/')[2]
    }


    getProfileFields() {
        return this.profile.all // all own fields
    }

    getProfileField(key) {
        return this.profile.get(key) // own field
    }

    /**
     *
     * @param key
     * @param value
     * @returns {Promise<*>} cid
     */
    async setProfileField(key, value) {
        return await this.profile.set(key, value)
    }

    async setProfileFields(fields) {
        const cids = {}
        for (let field of Object.keys(fields)) {
            cids[field] = await this.setProfileField(field, fields[field])
        }
        return cids
    }

    /**
     * Deletes profile's field
     * @param key
     * @returns {Promise<*>} cid
     */
    async deleteProfileField(key) {
        return await this.profile.del(key)
    }

    // Following

    /**
     * Follows user
     * @param uid
     * @returns {Promise<*>} cid
     */
    async follow(uid) {
        if (this.getUid() === uid) throw new Error('You can not follow yourself')
        return await this.following.set(uid, uid)
    }

    /**
     * Un-follows user
     * @param uid
     * @returns {Promise<*>} cid
     */
    async unFollow(uid) {
        return await this.following.del(uid)
    }

    getFollowing() {
        return this.following.all
    }

    // Posts
    /**
     * Builds post's data to use then with addPost
     * @param {string} title post title
     * @param {string} text post text
     * @param {string[]} coverMedia ipfs links to cover images or video
     * @param {string[]} files ipfs links to attached files
     * @param {string} product product id to attach to post
     * @returns {*}
     */
    buildPostData(title, text, coverMedia = [], files = [], product = undefined) {
        return {title: title, text: text, coverMedia: coverMedia, files: files, product: product}
    }

    /**
     * Adds a post
     * @param data post data - prepare it with buildPostData
     * @returns {Promise<*>} cid
     */
    async addPost(data) {
        data.author = this.getUid()
        // add likes counter
        const likesDbName = 'likesCounter.' + this.uuid()
        const likesDb = await this.orbitdb.counter(likesDbName, this.defaultDbOptions)
        data.likesCounter = likesDb.id

        // add re posts counter
        const rePostsDbName = 'rePostsCounter.' + this.uuid()
        const rePostsDb = await this.orbitdb.counter(rePostsDbName, this.defaultDbOptions)
        data.rePostsCounter = rePostsDb.id

        // add comments feed
        const commentsDbName = 'commentsFeed.' + this.uuid()
        const commentsDb = await this.orbitdb.feed(commentsDbName, this.defaultDbOptions)
        data.commentsFeed = commentsDb.id

        data.timestamp = this.getTimestamp()

        return await this.posts.add(data)
    }

    /**
     * Removes a post
     * @param hash
     * @returns {Promise<*>} cid
     */
    async removePost(hash) {
        return this.posts.remove(hash)
    }

    getPost(hash) {
        return this.posts.get(hash)
    }

    getAllPosts() {
        return this.posts.iterator({limit: -1}).collect()
    }

    /**
     * Queries posts with an options https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1
     * @param options
     * @returns {void|*} Posts array
     */
    queryPosts(options) {
        return this.posts.iterator(options).collect()
    }

    /**
     * Gets likes count of the post
     * @param post
     * @returns {Promise<number>} count
     */
    async getPostLikes(post) {
        const counter = await this.orbitdb.counter(post.likesCounter)
        await counter.load()
        return counter.value
    }

    /**
     * Likes a post
     * @param post
     * @returns {Promise<*>} cid
     */
    async likePost(post) {
        const counter = await this.orbitdb.counter(post.likesCounter)
        return await counter.inc()
    }

    /**
     * Gets all post's comments
     * @param postObject
     * @returns {Promise<LogEntry[]>} Array of all comments
     */
    async getPostComments(postObject) {
        const commentsDB = await this.orbitdb.feed(postObject.payload.value.commentsFeed)
        await commentsDB.load()
        return commentsDB.iterator({limit: -1}).collect()
    }

    /**
     * Comments a post
     * @param {*} postObject
     * @param {string} commentText text of the comment
     * @param {string} replyToCommentHash hash of the comment you want to reply
     * @returns {Promise<*>} cid
     */
    async commentPost(postObject, commentText, replyToCommentHash = undefined) {
        const commentsDB = await this.orbitdb.feed(postObject.payload.value.commentsFeed)
        const commentData = {
            commentText: commentText,
            replyToCommentCid: replyToCommentHash,
            timestamp: this.getTimestamp(),
        }
        return await commentsDB.add(commentData)
    }

    /**
     * Returns number of re posts
     * @param post
     * @returns {Promise<number>}
     */
    async getRePostsCount(post) {
        const counter = await this.orbitdb.counter(post.rePostsCounter)
        await counter.load()
        return counter.value
    }

    /**
     *  Re posts other person's post to own feed
     * @param authorUid user id
     * @param postHash Hash of the post to re-post
     * @param remark Your remark for post
     * @returns {Promise<string>}
     */
    async rePost(authorUid, postHash, remark) {
        if (authorUid === this.getUid()) throw new Error('You can not re post your own posts')
        const author = new Soveren(this.freedom)
        await author.create(authorUid)
        const post = await this.getPost(postHash)
        const isRePost = true
        const rePostData = {...post, remark, isRePost, originalAuthor: post.author, timestamp: this.getTimestamp()}
        await this.addPost(rePostData)
        const counter = await this.orbitdb.counter(post.rePostsCounter)
        return await counter.inc()
    }

    //TODO methods:

    //- messaging
    //sendMessage(uid, message)
    //onMessage(message)
    //getMessages(uid)


    //- shop
    //addProduct(product)
    //deleteProduct(pid)
    //buyProduct(pid)
    //rateProduct(pid, rating)
    //getProducts(uid)
    //getOwnProducts()


    //- donation
    //donateUser(uid)
    //donatePost(pid)
    //getUserDonations(uid)
    //getPostDonations(pid)

}

try {
    const IpfsLibrary = require('ipfs')
    const OrbitDBLibrary = require('orbit-db')

    const freedom = new Freedom(IpfsLibrary, OrbitDBLibrary)

    module.exports = exports = new Soveren(freedom)
} catch (e) {
    console.error(e.message)
    window.FW = new Soveren(window.Ipfs, window.OrbitDB)
}