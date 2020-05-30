'use strict'

// const hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
const UUIDv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Soveren {
    /**
     * Constructs Soveren object
     * @param IPFS
     * @param OrbitDB
     * @param ipfsRepo path to the local IPFS repository
     */
    constructor (IPFS, OrbitDB, ipfsRepo='./ipfs') {
        this.IPFS = IPFS
        this.OrbitDB = OrbitDB
        this.ipfsRepo = ipfsRepo
    }

    /**
     * Creates and initializes Soveren node
     * @returns {Promise<Object>}
     */
    async create () {
        try {
            this.ipfs = await this.IPFS.create({
                preload: {enabled: false},
                repo: this.ipfsRepo,
                EXPERIMENTAL: {pubsub: true},
                config: {
                    Bootstrap: [],
                    Addresses: {Swarm: []}
                }
            })

            // this.node.on('error', (e) => { throw (e) })
            // this.node.on('ready', this._init.bind(this))

            await this.ipfs.start();
            this.orbitdb = await this.OrbitDB.createInstance(this.ipfs)
            this.defaultOptions = {write: [this.orbitdb.identity.id]}
            // console.log('orbitdb', this.orbitdb.id, this.orbitdb.id.length)

            this.profile = await this.orbitdb.kvstore('profile', this.defaultOptions)
            await this.profile.load()

            this.following = await this.orbitdb.kvstore('following', this.defaultOptions)
            await this.following.load()
            await this.profile.set('following', this.following.id)

            this.posts = await this.orbitdb.feed('posts', this.defaultOptions)
            await this.posts.load()
            await this.profile.set('posts', this.posts.id)

            return this

        } catch(e) {
            throw (e)
        }
    }

    /**
     * Deletes profile's field
     * @param key
     * @returns {Promise<*>} cid
     */
    async deleteProfileField(key) {
        return await this.profile.del(key)
    }

    getProfileFields(uid=undefined) {
        if (!uid) return this.profile.all // all own fields
        //TODO get another profile by uid
        throw new Error('Incomplete')
    }

    getProfileField(key, uid=undefined) {
        if (!uid) return this.profile.get(key) // own field
        //TODO get another profile field by uid
        throw new Error('Incomplete')
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

    // Following

    /**
     * Follows user
     * @param uid
     * @returns {Promise<*>} cid
     */
    async follow(uid) {
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
     * Adds a post
     * @param data
     * @param options
     * @returns {Promise<*>} cid
     */
    async addPost(data, options = {}) {
        // add likes counter
        const likesDbName = 'likesCounter.' + UUIDv4()
        //TODO restrict likes by 1 per user
        const likesDb = await this.orbitdb.counter(likesDbName, this.defaultOptions)
        data._likesDbId = likesDb.id
        return await this.posts.add(data, options)
    }

    /**
     * Removes a post
     * @param hash
     * @param options
     * @returns {Promise<*>} cid
     */
    async removePost(hash, options = {}) {
        return this.posts.remove(hash, options)
    }

    getPost(hash) {
        return this.posts.get(hash)
    }

    getAllPosts() {
        return this.posts.iterator({ limit: -1 }).collect()
    }

    /**
     * Queries posts with an options https://github.com/orbitdb/orbit-db/blob/master/API.md#iteratoroptions-1
     * @param options
     * @returns {void|*} Posts array
     */
    queryPosts(options) {
        return this.posts.iterator(options).collect()
    }
    //TODO
    //getUid()

    //- posts
    //likePost(pid)
    //getPostLikes(pid)
    //commentPost(pid, comment)
    //getPostComments(pid)
    //getRePosts(pid)
    //rePost(pid, comment)

    //- messaging
    //sendMessage(uid, message)
    //onMessage(message)
    //getMessages(uid)

    //- donation
    //donateUser(uid)
    //donatePost(pid)
    //getUserDonations(uid)
    //getPostDonations(pid)

    //- shop
    //addProduct(product)
    //deleteProduct(pid)
    //buyProduct(pid)
    //rateProduct(pid, rating)
    //getProducts(uid)
    //getOwnProducts()



}

// try {
    const IpfsLibrary = require('ipfs')
    const OrbitDBLibrary = require('orbit-db')

    module.exports = exports = new Soveren(IpfsLibrary, OrbitDBLibrary)
// } catch (e) {
//     console.error(e.message)
//     window.FW = new Soveren(window.Ipfs, window.OrbitDB)
// }