(() => {
    var yp = Object.create;
    var Va = Object.defineProperty;
    var gp = Object.getOwnPropertyDescriptor;
    var wp = Object.getOwnPropertyNames;
    var kp = Object.getPrototypeOf
        , Sp = Object.prototype.hasOwnProperty;
    var vt = (e, t) => () => (t || e((t = {
        exports: {}
    }).exports, t),
        t.exports);
    var Np = (e, t, n, r) => {
        if (t && typeof t == "object" || typeof t == "function")
            for (let o of wp(t))
                !Sp.call(e, o) && o !== n && Va(e, o, {
                    get: () => t[o],
                    enumerable: !(r = gp(t, o)) || r.enumerable
                });
        return e
    }
        ;
    var R = (e, t, n) => (n = e != null ? yp(kp(e)) : {},
        Np(t || !e || !e.__esModule ? Va(n, "default", {
            value: e,
            enumerable: !0
        }) : n, e));
    var eu = vt(D => {
        "use strict";
        var lr = Symbol.for("react.element")
            , Ep = Symbol.for("react.portal")
            , Cp = Symbol.for("react.fragment")
            , _p = Symbol.for("react.strict_mode")
            , Pp = Symbol.for("react.profiler")
            , xp = Symbol.for("react.provider")
            , Tp = Symbol.for("react.context")
            , Mp = Symbol.for("react.forward_ref")
            , Lp = Symbol.for("react.suspense")
            , zp = Symbol.for("react.memo")
            , Rp = Symbol.for("react.lazy")
            , Ha = Symbol.iterator;
        function Ip(e) {
            return e === null || typeof e != "object" ? null : (e = Ha && e[Ha] || e["@@iterator"],
                typeof e == "function" ? e : null)
        }
        var Ka = {
            isMounted: function () {
                return !1
            },
            enqueueForceUpdate: function () { },
            enqueueReplaceState: function () { },
            enqueueSetState: function () { }
        }
            , Ga = Object.assign
            , Ya = {};
        function _n(e, t, n) {
            this.props = e,
                this.context = t,
                this.refs = Ya,
                this.updater = n || Ka
        }
        _n.prototype.isReactComponent = {};
        _n.prototype.setState = function (e, t) {
            if (typeof e != "object" && typeof e != "function" && e != null)
                throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
            this.updater.enqueueSetState(this, e, t, "setState")
        }
            ;
        _n.prototype.forceUpdate = function (e) {
            this.updater.enqueueForceUpdate(this, e, "forceUpdate")
        }
            ;
        function Xa() { }
        Xa.prototype = _n.prototype;
        function qi(e, t, n) {
            this.props = e,
                this.context = t,
                this.refs = Ya,
                this.updater = n || Ka
        }
        var Zi = qi.prototype = new Xa;
        Zi.constructor = qi;
        Ga(Zi, _n.prototype);
        Zi.isPureReactComponent = !0;
        var $a = Array.isArray
            , qa = Object.prototype.hasOwnProperty
            , Ji = {
                current: null
            }
            , Za = {
                key: !0,
                ref: !0,
                __self: !0,
                __source: !0
            };
        function Ja(e, t, n) {
            var r, o = {}, i = null, l = null;
            if (t != null)
                for (r in t.ref !== void 0 && (l = t.ref),
                    t.key !== void 0 && (i = "" + t.key),
                    t)
                    qa.call(t, r) && !Za.hasOwnProperty(r) && (o[r] = t[r]);
            var s = arguments.length - 2;
            if (s === 1)
                o.children = n;
            else if (1 < s) {
                for (var a = Array(s), u = 0; u < s; u++)
                    a[u] = arguments[u + 2];
                o.children = a
            }
            if (e && e.defaultProps)
                for (r in s = e.defaultProps,
                    s)
                    o[r] === void 0 && (o[r] = s[r]);
            return {
                $$typeof: lr,
                type: e,
                key: i,
                ref: l,
                props: o,
                _owner: Ji.current
            }
        }
        function Fp(e, t) {
            return {
                $$typeof: lr,
                type: e.type,
                key: t,
                ref: e.ref,
                props: e.props,
                _owner: e._owner
            }
        }
        function bi(e) {
            return typeof e == "object" && e !== null && e.$$typeof === lr
        }
        function Dp(e) {
            var t = {
                "=": "=0",
                ":": "=2"
            };
            return "$" + e.replace(/[=:]/g, function (n) {
                return t[n]
            })
        }
        var Qa = /\/+/g;
        function Xi(e, t) {
            return typeof e == "object" && e !== null && e.key != null ? Dp("" + e.key) : t.toString(36)
        }
        function uo(e, t, n, r, o) {
            var i = typeof e;
            (i === "undefined" || i === "boolean") && (e = null);
            var l = !1;
            if (e === null)
                l = !0;
            else
                switch (i) {
                    case "string":
                    case "number":
                        l = !0;
                        break;
                    case "object":
                        switch (e.$$typeof) {
                            case lr:
                            case Ep:
                                l = !0
                        }
                }
            if (l)
                return l = e,
                    o = o(l),
                    e = r === "" ? "." + Xi(l, 0) : r,
                    $a(o) ? (n = "",
                        e != null && (n = e.replace(Qa, "$&/") + "/"),
                        uo(o, t, n, "", function (u) {
                            return u
                        })) : o != null && (bi(o) && (o = Fp(o, n + (!o.key || l && l.key === o.key ? "" : ("" + o.key).replace(Qa, "$&/") + "/") + e)),
                            t.push(o)),
                    1;
            if (l = 0,
                r = r === "" ? "." : r + ":",
                $a(e))
                for (var s = 0; s < e.length; s++) {
                    i = e[s];
                    var a = r + Xi(i, s);
                    l += uo(i, t, n, a, o)
                }
            else if (a = Ip(e),
                typeof a == "function")
                for (e = a.call(e),
                    s = 0; !(i = e.next()).done;)
                    i = i.value,
                        a = r + Xi(i, s++),
                        l += uo(i, t, n, a, o);
            else if (i === "object")
                throw t = String(e),
                Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
            return l
        }
        function ao(e, t, n) {
            if (e == null)
                return e;
            var r = []
                , o = 0;
            return uo(e, r, "", "", function (i) {
                return t.call(n, i, o++)
            }),
                r
        }
        function Op(e) {
            if (e._status === -1) {
                var t = e._result;
                t = t(),
                    t.then(function (n) {
                        (e._status === 0 || e._status === -1) && (e._status = 1,
                            e._result = n)
                    }, function (n) {
                        (e._status === 0 || e._status === -1) && (e._status = 2,
                            e._result = n)
                    }),
                    e._status === -1 && (e._status = 0,
                        e._result = t)
            }
            if (e._status === 1)
                return e._result.default;
            throw e._result
        }
        var ke = {
            current: null
        }
            , co = {
                transition: null
            }
            , Ap = {
                ReactCurrentDispatcher: ke,
                ReactCurrentBatchConfig: co,
                ReactCurrentOwner: Ji
            };
        function ba() {
            throw Error("act(...) is not supported in production builds of React.")
        }
        D.Children = {
            map: ao,
            forEach: function (e, t, n) {
                ao(e, function () {
                    t.apply(this, arguments)
                }, n)
            },
            count: function (e) {
                var t = 0;
                return ao(e, function () {
                    t++
                }),
                    t
            },
            toArray: function (e) {
                return ao(e, function (t) {
                    return t
                }) || []
            },
            only: function (e) {
                if (!bi(e))
                    throw Error("React.Children.only expected to receive a single React element child.");
                return e
            }
        };
        D.Component = _n;
        D.Fragment = Cp;
        D.Profiler = Pp;
        D.PureComponent = qi;
        D.StrictMode = _p;
        D.Suspense = Lp;
        D.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Ap;
        D.act = ba;
        D.cloneElement = function (e, t, n) {
            if (e == null)
                throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
            var r = Ga({}, e.props)
                , o = e.key
                , i = e.ref
                , l = e._owner;
            if (t != null) {
                if (t.ref !== void 0 && (i = t.ref,
                    l = Ji.current),
                    t.key !== void 0 && (o = "" + t.key),
                    e.type && e.type.defaultProps)
                    var s = e.type.defaultProps;
                for (a in t)
                    qa.call(t, a) && !Za.hasOwnProperty(a) && (r[a] = t[a] === void 0 && s !== void 0 ? s[a] : t[a])
            }
            var a = arguments.length - 2;
            if (a === 1)
                r.children = n;
            else if (1 < a) {
                s = Array(a);
                for (var u = 0; u < a; u++)
                    s[u] = arguments[u + 2];
                r.children = s
            }
            return {
                $$typeof: lr,
                type: e.type,
                key: o,
                ref: i,
                props: r,
                _owner: l
            }
        }
            ;
        D.createContext = function (e) {
            return e = {
                $$typeof: Tp,
                _currentValue: e,
                _currentValue2: e,
                _threadCount: 0,
                Provider: null,
                Consumer: null,
                _defaultValue: null,
                _globalName: null
            },
                e.Provider = {
                    $$typeof: xp,
                    _context: e
                },
                e.Consumer = e
        }
            ;
        D.createElement = Ja;
        D.createFactory = function (e) {
            var t = Ja.bind(null, e);
            return t.type = e,
                t
        }
            ;
        D.createRef = function () {
            return {
                current: null
            }
        }
            ;
        D.forwardRef = function (e) {
            return {
                $$typeof: Mp,
                render: e
            }
        }
            ;
        D.isValidElement = bi;
        D.lazy = function (e) {
            return {
                $$typeof: Rp,
                _payload: {
                    _status: -1,
                    _result: e
                },
                _init: Op
            }
        }
            ;
        D.memo = function (e, t) {
            return {
                $$typeof: zp,
                type: e,
                compare: t === void 0 ? null : t
            }
        }
            ;
        D.startTransition = function (e) {
            var t = co.transition;
            co.transition = {};
            try {
                e()
            } finally {
                co.transition = t
            }
        }
            ;
        D.unstable_act = ba;
        D.useCallback = function (e, t) {
            return ke.current.useCallback(e, t)
        }
            ;
        D.useContext = function (e) {
            return ke.current.useContext(e)
        }
            ;
        D.useDebugValue = function () { }
            ;
        D.useDeferredValue = function (e) {
            return ke.current.useDeferredValue(e)
        }
            ;
        D.useEffect = function (e, t) {
            return ke.current.useEffect(e, t)
        }
            ;
        D.useId = function () {
            return ke.current.useId()
        }
            ;
        D.useImperativeHandle = function (e, t, n) {
            return ke.current.useImperativeHandle(e, t, n)
        }
            ;
        D.useInsertionEffect = function (e, t) {
            return ke.current.useInsertionEffect(e, t)
        }
            ;
        D.useLayoutEffect = function (e, t) {
            return ke.current.useLayoutEffect(e, t)
        }
            ;
        D.useMemo = function (e, t) {
            return ke.current.useMemo(e, t)
        }
            ;
        D.useReducer = function (e, t, n) {
            return ke.current.useReducer(e, t, n)
        }
            ;
        D.useRef = function (e) {
            return ke.current.useRef(e)
        }
            ;
        D.useState = function (e) {
            return ke.current.useState(e)
        }
            ;
        D.useSyncExternalStore = function (e, t, n) {
            return ke.current.useSyncExternalStore(e, t, n)
        }
            ;
        D.useTransition = function () {
            return ke.current.useTransition()
        }
            ;
        D.version = "18.3.1"
    }
    );
    var ee = vt((uv, tu) => {
        "use strict";
        tu.exports = eu()
    }
    );
    var du = vt(H => {
        "use strict";
        function rl(e, t) {
            var n = e.length;
            e.push(t);
            e: for (; 0 < n;) {
                var r = n - 1 >>> 1
                    , o = e[r];
                if (0 < fo(o, t))
                    e[r] = t,
                        e[n] = o,
                        n = r;
                else
                    break e
            }
        }
        function Ge(e) {
            return e.length === 0 ? null : e[0]
        }
        function mo(e) {
            if (e.length === 0)
                return null;
            var t = e[0]
                , n = e.pop();
            if (n !== t) {
                e[0] = n;
                e: for (var r = 0, o = e.length, i = o >>> 1; r < i;) {
                    var l = 2 * (r + 1) - 1
                        , s = e[l]
                        , a = l + 1
                        , u = e[a];
                    if (0 > fo(s, n))
                        a < o && 0 > fo(u, s) ? (e[r] = u,
                            e[a] = n,
                            r = a) : (e[r] = s,
                                e[l] = n,
                                r = l);
                    else if (a < o && 0 > fo(u, n))
                        e[r] = u,
                            e[a] = n,
                            r = a;
                    else
                        break e
                }
            }
            return t
        }
        function fo(e, t) {
            var n = e.sortIndex - t.sortIndex;
            return n !== 0 ? n : e.id - t.id
        }
        typeof performance == "object" && typeof performance.now == "function" ? (nu = performance,
            H.unstable_now = function () {
                return nu.now()
            }
        ) : (el = Date,
            ru = el.now(),
            H.unstable_now = function () {
                return el.now() - ru
            }
        );
        var nu, el, ru, ot = [], Rt = [], Bp = 1, Be = null, pe = 3, ho = !1, on = !1, ar = !1, lu = typeof setTimeout == "function" ? setTimeout : null, su = typeof clearTimeout == "function" ? clearTimeout : null, ou = typeof setImmediate < "u" ? setImmediate : null;
        typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
        function ol(e) {
            for (var t = Ge(Rt); t !== null;) {
                if (t.callback === null)
                    mo(Rt);
                else if (t.startTime <= e)
                    mo(Rt),
                        t.sortIndex = t.expirationTime,
                        rl(ot, t);
                else
                    break;
                t = Ge(Rt)
            }
        }
        function il(e) {
            if (ar = !1,
                ol(e),
                !on)
                if (Ge(ot) !== null)
                    on = !0,
                        sl(ll);
                else {
                    var t = Ge(Rt);
                    t !== null && al(il, t.startTime - e)
                }
        }
        function ll(e, t) {
            on = !1,
                ar && (ar = !1,
                    su(ur),
                    ur = -1),
                ho = !0;
            var n = pe;
            try {
                for (ol(t),
                    Be = Ge(ot); Be !== null && (!(Be.expirationTime > t) || e && !cu());) {
                    var r = Be.callback;
                    if (typeof r == "function") {
                        Be.callback = null,
                            pe = Be.priorityLevel;
                        var o = r(Be.expirationTime <= t);
                        t = H.unstable_now(),
                            typeof o == "function" ? Be.callback = o : Be === Ge(ot) && mo(ot),
                            ol(t)
                    } else
                        mo(ot);
                    Be = Ge(ot)
                }
                if (Be !== null)
                    var i = !0;
                else {
                    var l = Ge(Rt);
                    l !== null && al(il, l.startTime - t),
                        i = !1
                }
                return i
            } finally {
                Be = null,
                    pe = n,
                    ho = !1
            }
        }
        var vo = !1
            , po = null
            , ur = -1
            , au = 5
            , uu = -1;
        function cu() {
            return !(H.unstable_now() - uu < au)
        }
        function tl() {
            if (po !== null) {
                var e = H.unstable_now();
                uu = e;
                var t = !0;
                try {
                    t = po(!0, e)
                } finally {
                    t ? sr() : (vo = !1,
                        po = null)
                }
            } else
                vo = !1
        }
        var sr;
        typeof ou == "function" ? sr = function () {
            ou(tl)
        }
            : typeof MessageChannel < "u" ? (nl = new MessageChannel,
                iu = nl.port2,
                nl.port1.onmessage = tl,
                sr = function () {
                    iu.postMessage(null)
                }
            ) : sr = function () {
                lu(tl, 0)
            }
            ;
        var nl, iu;
        function sl(e) {
            po = e,
                vo || (vo = !0,
                    sr())
        }
        function al(e, t) {
            ur = lu(function () {
                e(H.unstable_now())
            }, t)
        }
        H.unstable_IdlePriority = 5;
        H.unstable_ImmediatePriority = 1;
        H.unstable_LowPriority = 4;
        H.unstable_NormalPriority = 3;
        H.unstable_Profiling = null;
        H.unstable_UserBlockingPriority = 2;
        H.unstable_cancelCallback = function (e) {
            e.callback = null
        }
            ;
        H.unstable_continueExecution = function () {
            on || ho || (on = !0,
                sl(ll))
        }
            ;
        H.unstable_forceFrameRate = function (e) {
            0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : au = 0 < e ? Math.floor(1e3 / e) : 5
        }
            ;
        H.unstable_getCurrentPriorityLevel = function () {
            return pe
        }
            ;
        H.unstable_getFirstCallbackNode = function () {
            return Ge(ot)
        }
            ;
        H.unstable_next = function (e) {
            switch (pe) {
                case 1:
                case 2:
                case 3:
                    var t = 3;
                    break;
                default:
                    t = pe
            }
            var n = pe;
            pe = t;
            try {
                return e()
            } finally {
                pe = n
            }
        }
            ;
        H.unstable_pauseExecution = function () { }
            ;
        H.unstable_requestPaint = function () { }
            ;
        H.unstable_runWithPriority = function (e, t) {
            switch (e) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                default:
                    e = 3
            }
            var n = pe;
            pe = e;
            try {
                return t()
            } finally {
                pe = n
            }
        }
            ;
        H.unstable_scheduleCallback = function (e, t, n) {
            var r = H.unstable_now();
            switch (typeof n == "object" && n !== null ? (n = n.delay,
                n = typeof n == "number" && 0 < n ? r + n : r) : n = r,
            e) {
                case 1:
                    var o = -1;
                    break;
                case 2:
                    o = 250;
                    break;
                case 5:
                    o = 1073741823;
                    break;
                case 4:
                    o = 1e4;
                    break;
                default:
                    o = 5e3
            }
            return o = n + o,
                e = {
                    id: Bp++,
                    callback: t,
                    priorityLevel: e,
                    startTime: n,
                    expirationTime: o,
                    sortIndex: -1
                },
                n > r ? (e.sortIndex = n,
                    rl(Rt, e),
                    Ge(ot) === null && e === Ge(Rt) && (ar ? (su(ur),
                        ur = -1) : ar = !0,
                        al(il, n - r))) : (e.sortIndex = o,
                            rl(ot, e),
                            on || ho || (on = !0,
                                sl(ll))),
                e
        }
            ;
        H.unstable_shouldYield = cu;
        H.unstable_wrapCallback = function (e) {
            var t = pe;
            return function () {
                var n = pe;
                pe = t;
                try {
                    return e.apply(this, arguments)
                } finally {
                    pe = n
                }
            }
        }
    }
    );
    var pu = vt((dv, fu) => {
        "use strict";
        fu.exports = du()
    }
    );
    var gf = vt(Oe => {
        "use strict";
        var Wp = ee()
            , Fe = pu();
        function N(e) {
            for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++)
                t += "&args[]=" + encodeURIComponent(arguments[n]);
            return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
        }
        var kc = new Set
            , zr = {};
        function gn(e, t) {
            Kn(e, t),
                Kn(e + "Capture", t)
        }
        function Kn(e, t) {
            for (zr[e] = t,
                e = 0; e < t.length; e++)
                kc.add(t[e])
        }
        var Nt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u")
            , zl = Object.prototype.hasOwnProperty
            , Up = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/
            , mu = {}
            , hu = {};
        function jp(e) {
            return zl.call(hu, e) ? !0 : zl.call(mu, e) ? !1 : Up.test(e) ? hu[e] = !0 : (mu[e] = !0,
                !1)
        }
        function Vp(e, t, n, r) {
            if (n !== null && n.type === 0)
                return !1;
            switch (typeof t) {
                case "function":
                case "symbol":
                    return !0;
                case "boolean":
                    return r ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5),
                        e !== "data-" && e !== "aria-");
                default:
                    return !1
            }
        }
        function Hp(e, t, n, r) {
            if (t === null || typeof t > "u" || Vp(e, t, n, r))
                return !0;
            if (r)
                return !1;
            if (n !== null)
                switch (n.type) {
                    case 3:
                        return !t;
                    case 4:
                        return t === !1;
                    case 5:
                        return isNaN(t);
                    case 6:
                        return isNaN(t) || 1 > t
                }
            return !1
        }
        function Ee(e, t, n, r, o, i, l) {
            this.acceptsBooleans = t === 2 || t === 3 || t === 4,
                this.attributeName = r,
                this.attributeNamespace = o,
                this.mustUseProperty = n,
                this.propertyName = e,
                this.type = t,
                this.sanitizeURL = i,
                this.removeEmptyString = l
        }
        var fe = {};
        "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function (e) {
            fe[e] = new Ee(e, 0, !1, e, null, !1, !1)
        });
        [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function (e) {
            var t = e[0];
            fe[t] = new Ee(t, 1, !1, e[1], null, !1, !1)
        });
        ["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
            fe[e] = new Ee(e, 2, !1, e.toLowerCase(), null, !1, !1)
        });
        ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function (e) {
            fe[e] = new Ee(e, 2, !1, e, null, !1, !1)
        });
        "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function (e) {
            fe[e] = new Ee(e, 3, !1, e.toLowerCase(), null, !1, !1)
        });
        ["checked", "multiple", "muted", "selected"].forEach(function (e) {
            fe[e] = new Ee(e, 3, !0, e, null, !1, !1)
        });
        ["capture", "download"].forEach(function (e) {
            fe[e] = new Ee(e, 4, !1, e, null, !1, !1)
        });
        ["cols", "rows", "size", "span"].forEach(function (e) {
            fe[e] = new Ee(e, 6, !1, e, null, !1, !1)
        });
        ["rowSpan", "start"].forEach(function (e) {
            fe[e] = new Ee(e, 5, !1, e.toLowerCase(), null, !1, !1)
        });
        var Es = /[\-:]([a-z])/g;
        function Cs(e) {
            return e[1].toUpperCase()
        }
        "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function (e) {
            var t = e.replace(Es, Cs);
            fe[t] = new Ee(t, 1, !1, e, null, !1, !1)
        });
        "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function (e) {
            var t = e.replace(Es, Cs);
            fe[t] = new Ee(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1)
        });
        ["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
            var t = e.replace(Es, Cs);
            fe[t] = new Ee(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1)
        });
        ["tabIndex", "crossOrigin"].forEach(function (e) {
            fe[e] = new Ee(e, 1, !1, e.toLowerCase(), null, !1, !1)
        });
        fe.xlinkHref = new Ee("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
        ["src", "href", "action", "formAction"].forEach(function (e) {
            fe[e] = new Ee(e, 1, !1, e.toLowerCase(), null, !0, !0)
        });
        function _s(e, t, n, r) {
            var o = fe.hasOwnProperty(t) ? fe[t] : null;
            (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (Hp(t, n, o, r) && (n = null),
                r || o === null ? jp(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName,
                    r = o.attributeNamespace,
                    n === null ? e.removeAttribute(t) : (o = o.type,
                        n = o === 3 || o === 4 && n === !0 ? "" : "" + n,
                        r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))))
        }
        var Pt = Wp.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
            , yo = Symbol.for("react.element")
            , Tn = Symbol.for("react.portal")
            , Mn = Symbol.for("react.fragment")
            , Ps = Symbol.for("react.strict_mode")
            , Rl = Symbol.for("react.profiler")
            , Sc = Symbol.for("react.provider")
            , Nc = Symbol.for("react.context")
            , xs = Symbol.for("react.forward_ref")
            , Il = Symbol.for("react.suspense")
            , Fl = Symbol.for("react.suspense_list")
            , Ts = Symbol.for("react.memo")
            , Ft = Symbol.for("react.lazy");
        Symbol.for("react.scope");
        Symbol.for("react.debug_trace_mode");
        var Ec = Symbol.for("react.offscreen");
        Symbol.for("react.legacy_hidden");
        Symbol.for("react.cache");
        Symbol.for("react.tracing_marker");
        var vu = Symbol.iterator;
        function cr(e) {
            return e === null || typeof e != "object" ? null : (e = vu && e[vu] || e["@@iterator"],
                typeof e == "function" ? e : null)
        }
        var Z = Object.assign, ul;
        function gr(e) {
            if (ul === void 0)
                try {
                    throw Error()
                } catch (n) {
                    var t = n.stack.trim().match(/\n( *(at )?)/);
                    ul = t && t[1] || ""
                }
            return `
` + ul + e
        }
        var cl = !1;
        function dl(e, t) {
            if (!e || cl)
                return "";
            cl = !0;
            var n = Error.prepareStackTrace;
            Error.prepareStackTrace = void 0;
            try {
                if (t)
                    if (t = function () {
                        throw Error()
                    }
                        ,
                        Object.defineProperty(t.prototype, "props", {
                            set: function () {
                                throw Error()
                            }
                        }),
                        typeof Reflect == "object" && Reflect.construct) {
                        try {
                            Reflect.construct(t, [])
                        } catch (u) {
                            var r = u
                        }
                        Reflect.construct(e, [], t)
                    } else {
                        try {
                            t.call()
                        } catch (u) {
                            r = u
                        }
                        e.call(t.prototype)
                    }
                else {
                    try {
                        throw Error()
                    } catch (u) {
                        r = u
                    }
                    e()
                }
            } catch (u) {
                if (u && r && typeof u.stack == "string") {
                    for (var o = u.stack.split(`
`), i = r.stack.split(`
`), l = o.length - 1, s = i.length - 1; 1 <= l && 0 <= s && o[l] !== i[s];)
                        s--;
                    for (; 1 <= l && 0 <= s; l--,
                        s--)
                        if (o[l] !== i[s]) {
                            if (l !== 1 || s !== 1)
                                do
                                    if (l--,
                                        s--,
                                        0 > s || o[l] !== i[s]) {
                                        var a = `
` + o[l].replace(" at new ", " at ");
                                        return e.displayName && a.includes("<anonymous>") && (a = a.replace("<anonymous>", e.displayName)),
                                            a
                                    }
                                while (1 <= l && 0 <= s);
                            break
                        }
                }
            } finally {
                cl = !1,
                    Error.prepareStackTrace = n
            }
            return (e = e ? e.displayName || e.name : "") ? gr(e) : ""
        }
        function $p(e) {
            switch (e.tag) {
                case 5:
                    return gr(e.type);
                case 16:
                    return gr("Lazy");
                case 13:
                    return gr("Suspense");
                case 19:
                    return gr("SuspenseList");
                case 0:
                case 2:
                case 15:
                    return e = dl(e.type, !1),
                        e;
                case 11:
                    return e = dl(e.type.render, !1),
                        e;
                case 1:
                    return e = dl(e.type, !0),
                        e;
                default:
                    return ""
            }
        }
        function Dl(e) {
            if (e == null)
                return null;
            if (typeof e == "function")
                return e.displayName || e.name || null;
            if (typeof e == "string")
                return e;
            switch (e) {
                case Mn:
                    return "Fragment";
                case Tn:
                    return "Portal";
                case Rl:
                    return "Profiler";
                case Ps:
                    return "StrictMode";
                case Il:
                    return "Suspense";
                case Fl:
                    return "SuspenseList"
            }
            if (typeof e == "object")
                switch (e.$$typeof) {
                    case Nc:
                        return (e.displayName || "Context") + ".Consumer";
                    case Sc:
                        return (e._context.displayName || "Context") + ".Provider";
                    case xs:
                        var t = e.render;
                        return e = e.displayName,
                            e || (e = t.displayName || t.name || "",
                                e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"),
                            e;
                    case Ts:
                        return t = e.displayName || null,
                            t !== null ? t : Dl(e.type) || "Memo";
                    case Ft:
                        t = e._payload,
                            e = e._init;
                        try {
                            return Dl(e(t))
                        } catch { }
                }
            return null
        }
        function Qp(e) {
            var t = e.type;
            switch (e.tag) {
                case 24:
                    return "Cache";
                case 9:
                    return (t.displayName || "Context") + ".Consumer";
                case 10:
                    return (t._context.displayName || "Context") + ".Provider";
                case 18:
                    return "DehydratedFragment";
                case 11:
                    return e = t.render,
                        e = e.displayName || e.name || "",
                        t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
                case 7:
                    return "Fragment";
                case 5:
                    return t;
                case 4:
                    return "Portal";
                case 3:
                    return "Root";
                case 6:
                    return "Text";
                case 16:
                    return Dl(t);
                case 8:
                    return t === Ps ? "StrictMode" : "Mode";
                case 22:
                    return "Offscreen";
                case 12:
                    return "Profiler";
                case 21:
                    return "Scope";
                case 13:
                    return "Suspense";
                case 19:
                    return "SuspenseList";
                case 25:
                    return "TracingMarker";
                case 1:
                case 0:
                case 17:
                case 2:
                case 14:
                case 15:
                    if (typeof t == "function")
                        return t.displayName || t.name || null;
                    if (typeof t == "string")
                        return t
            }
            return null
        }
        function Yt(e) {
            switch (typeof e) {
                case "boolean":
                case "number":
                case "string":
                case "undefined":
                    return e;
                case "object":
                    return e;
                default:
                    return ""
            }
        }
        function Cc(e) {
            var t = e.type;
            return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio")
        }
        function Kp(e) {
            var t = Cc(e) ? "checked" : "value"
                , n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t)
                , r = "" + e[t];
            if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
                var o = n.get
                    , i = n.set;
                return Object.defineProperty(e, t, {
                    configurable: !0,
                    get: function () {
                        return o.call(this)
                    },
                    set: function (l) {
                        r = "" + l,
                            i.call(this, l)
                    }
                }),
                    Object.defineProperty(e, t, {
                        enumerable: n.enumerable
                    }),
                {
                    getValue: function () {
                        return r
                    },
                    setValue: function (l) {
                        r = "" + l
                    },
                    stopTracking: function () {
                        e._valueTracker = null,
                            delete e[t]
                    }
                }
            }
        }
        function go(e) {
            e._valueTracker || (e._valueTracker = Kp(e))
        }
        function _c(e) {
            if (!e)
                return !1;
            var t = e._valueTracker;
            if (!t)
                return !0;
            var n = t.getValue()
                , r = "";
            return e && (r = Cc(e) ? e.checked ? "true" : "false" : e.value),
                e = r,
                e !== n ? (t.setValue(e),
                    !0) : !1
        }
        function Ko(e) {
            if (e = e || (typeof document < "u" ? document : void 0),
                typeof e > "u")
                return null;
            try {
                return e.activeElement || e.body
            } catch {
                return e.body
            }
        }
        function Ol(e, t) {
            var n = t.checked;
            return Z({}, t, {
                defaultChecked: void 0,
                defaultValue: void 0,
                value: void 0,
                checked: n ?? e._wrapperState.initialChecked
            })
        }
        function yu(e, t) {
            var n = t.defaultValue == null ? "" : t.defaultValue
                , r = t.checked != null ? t.checked : t.defaultChecked;
            n = Yt(t.value != null ? t.value : n),
                e._wrapperState = {
                    initialChecked: r,
                    initialValue: n,
                    controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null
                }
        }
        function Pc(e, t) {
            t = t.checked,
                t != null && _s(e, "checked", t, !1)
        }
        function Al(e, t) {
            Pc(e, t);
            var n = Yt(t.value)
                , r = t.type;
            if (n != null)
                r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
            else if (r === "submit" || r === "reset") {
                e.removeAttribute("value");
                return
            }
            t.hasOwnProperty("value") ? Bl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Bl(e, t.type, Yt(t.defaultValue)),
                t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked)
        }
        function gu(e, t, n) {
            if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
                var r = t.type;
                if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null))
                    return;
                t = "" + e._wrapperState.initialValue,
                    n || t === e.value || (e.value = t),
                    e.defaultValue = t
            }
            n = e.name,
                n !== "" && (e.name = ""),
                e.defaultChecked = !!e._wrapperState.initialChecked,
                n !== "" && (e.name = n)
        }
        function Bl(e, t, n) {
            (t !== "number" || Ko(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n))
        }
        var wr = Array.isArray;
        function Un(e, t, n, r) {
            if (e = e.options,
                t) {
                t = {};
                for (var o = 0; o < n.length; o++)
                    t["$" + n[o]] = !0;
                for (n = 0; n < e.length; n++)
                    o = t.hasOwnProperty("$" + e[n].value),
                        e[n].selected !== o && (e[n].selected = o),
                        o && r && (e[n].defaultSelected = !0)
            } else {
                for (n = "" + Yt(n),
                    t = null,
                    o = 0; o < e.length; o++) {
                    if (e[o].value === n) {
                        e[o].selected = !0,
                            r && (e[o].defaultSelected = !0);
                        return
                    }
                    t !== null || e[o].disabled || (t = e[o])
                }
                t !== null && (t.selected = !0)
            }
        }
        function Wl(e, t) {
            if (t.dangerouslySetInnerHTML != null)
                throw Error(N(91));
            return Z({}, t, {
                value: void 0,
                defaultValue: void 0,
                children: "" + e._wrapperState.initialValue
            })
        }
        function wu(e, t) {
            var n = t.value;
            if (n == null) {
                if (n = t.children,
                    t = t.defaultValue,
                    n != null) {
                    if (t != null)
                        throw Error(N(92));
                    if (wr(n)) {
                        if (1 < n.length)
                            throw Error(N(93));
                        n = n[0]
                    }
                    t = n
                }
                t == null && (t = ""),
                    n = t
            }
            e._wrapperState = {
                initialValue: Yt(n)
            }
        }
        function xc(e, t) {
            var n = Yt(t.value)
                , r = Yt(t.defaultValue);
            n != null && (n = "" + n,
                n !== e.value && (e.value = n),
                t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
                r != null && (e.defaultValue = "" + r)
        }
        function ku(e) {
            var t = e.textContent;
            t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t)
        }
        function Tc(e) {
            switch (e) {
                case "svg":
                    return "http://www.w3.org/2000/svg";
                case "math":
                    return "http://www.w3.org/1998/Math/MathML";
                default:
                    return "http://www.w3.org/1999/xhtml"
            }
        }
        function Ul(e, t) {
            return e == null || e === "http://www.w3.org/1999/xhtml" ? Tc(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e
        }
        var wo, Mc = (function (e) {
            return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function (t, n, r, o) {
                MSApp.execUnsafeLocalFunction(function () {
                    return e(t, n, r, o)
                })
            }
                : e
        }
        )(function (e, t) {
            if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
                e.innerHTML = t;
            else {
                for (wo = wo || document.createElement("div"),
                    wo.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>",
                    t = wo.firstChild; e.firstChild;)
                    e.removeChild(e.firstChild);
                for (; t.firstChild;)
                    e.appendChild(t.firstChild)
            }
        });
        function Rr(e, t) {
            if (t) {
                var n = e.firstChild;
                if (n && n === e.lastChild && n.nodeType === 3) {
                    n.nodeValue = t;
                    return
                }
            }
            e.textContent = t
        }
        var Nr = {
            animationIterationCount: !0,
            aspectRatio: !0,
            borderImageOutset: !0,
            borderImageSlice: !0,
            borderImageWidth: !0,
            boxFlex: !0,
            boxFlexGroup: !0,
            boxOrdinalGroup: !0,
            columnCount: !0,
            columns: !0,
            flex: !0,
            flexGrow: !0,
            flexPositive: !0,
            flexShrink: !0,
            flexNegative: !0,
            flexOrder: !0,
            gridArea: !0,
            gridRow: !0,
            gridRowEnd: !0,
            gridRowSpan: !0,
            gridRowStart: !0,
            gridColumn: !0,
            gridColumnEnd: !0,
            gridColumnSpan: !0,
            gridColumnStart: !0,
            fontWeight: !0,
            lineClamp: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            tabSize: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0,
            fillOpacity: !0,
            floodOpacity: !0,
            stopOpacity: !0,
            strokeDasharray: !0,
            strokeDashoffset: !0,
            strokeMiterlimit: !0,
            strokeOpacity: !0,
            strokeWidth: !0
        }
            , Gp = ["Webkit", "ms", "Moz", "O"];
        Object.keys(Nr).forEach(function (e) {
            Gp.forEach(function (t) {
                t = t + e.charAt(0).toUpperCase() + e.substring(1),
                    Nr[t] = Nr[e]
            })
        });
        function Lc(e, t, n) {
            return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Nr.hasOwnProperty(e) && Nr[e] ? ("" + t).trim() : t + "px"
        }
        function zc(e, t) {
            e = e.style;
            for (var n in t)
                if (t.hasOwnProperty(n)) {
                    var r = n.indexOf("--") === 0
                        , o = Lc(n, t[n], r);
                    n === "float" && (n = "cssFloat"),
                        r ? e.setProperty(n, o) : e[n] = o
                }
        }
        var Yp = Z({
            menuitem: !0
        }, {
            area: !0,
            base: !0,
            br: !0,
            col: !0,
            embed: !0,
            hr: !0,
            img: !0,
            input: !0,
            keygen: !0,
            link: !0,
            meta: !0,
            param: !0,
            source: !0,
            track: !0,
            wbr: !0
        });
        function jl(e, t) {
            if (t) {
                if (Yp[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
                    throw Error(N(137, e));
                if (t.dangerouslySetInnerHTML != null) {
                    if (t.children != null)
                        throw Error(N(60));
                    if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML))
                        throw Error(N(61))
                }
                if (t.style != null && typeof t.style != "object")
                    throw Error(N(62))
            }
        }
        function Vl(e, t) {
            if (e.indexOf("-") === -1)
                return typeof t.is == "string";
            switch (e) {
                case "annotation-xml":
                case "color-profile":
                case "font-face":
                case "font-face-src":
                case "font-face-uri":
                case "font-face-format":
                case "font-face-name":
                case "missing-glyph":
                    return !1;
                default:
                    return !0
            }
        }
        var Hl = null;
        function Ms(e) {
            return e = e.target || e.srcElement || window,
                e.correspondingUseElement && (e = e.correspondingUseElement),
                e.nodeType === 3 ? e.parentNode : e
        }
        var $l = null
            , jn = null
            , Vn = null;
        function Su(e) {
            if (e = qr(e)) {
                if (typeof $l != "function")
                    throw Error(N(280));
                var t = e.stateNode;
                t && (t = ki(t),
                    $l(e.stateNode, e.type, t))
            }
        }
        function Rc(e) {
            jn ? Vn ? Vn.push(e) : Vn = [e] : jn = e
        }
        function Ic() {
            if (jn) {
                var e = jn
                    , t = Vn;
                if (Vn = jn = null,
                    Su(e),
                    t)
                    for (e = 0; e < t.length; e++)
                        Su(t[e])
            }
        }
        function Fc(e, t) {
            return e(t)
        }
        function Dc() { }
        var fl = !1;
        function Oc(e, t, n) {
            if (fl)
                return e(t, n);
            fl = !0;
            try {
                return Fc(e, t, n)
            } finally {
                fl = !1,
                    (jn !== null || Vn !== null) && (Dc(),
                        Ic())
            }
        }
        function Ir(e, t) {
            var n = e.stateNode;
            if (n === null)
                return null;
            var r = ki(n);
            if (r === null)
                return null;
            n = r[t];
            e: switch (t) {
                case "onClick":
                case "onClickCapture":
                case "onDoubleClick":
                case "onDoubleClickCapture":
                case "onMouseDown":
                case "onMouseDownCapture":
                case "onMouseMove":
                case "onMouseMoveCapture":
                case "onMouseUp":
                case "onMouseUpCapture":
                case "onMouseEnter":
                    (r = !r.disabled) || (e = e.type,
                        r = !(e === "button" || e === "input" || e === "select" || e === "textarea")),
                        e = !r;
                    break e;
                default:
                    e = !1
            }
            if (e)
                return null;
            if (n && typeof n != "function")
                throw Error(N(231, t, typeof n));
            return n
        }
        var Ql = !1;
        if (Nt)
            try {
                Pn = {},
                    Object.defineProperty(Pn, "passive", {
                        get: function () {
                            Ql = !0
                        }
                    }),
                    window.addEventListener("test", Pn, Pn),
                    window.removeEventListener("test", Pn, Pn)
            } catch {
                Ql = !1
            }
        var Pn;
        function Xp(e, t, n, r, o, i, l, s, a) {
            var u = Array.prototype.slice.call(arguments, 3);
            try {
                t.apply(n, u)
            } catch (d) {
                this.onError(d)
            }
        }
        var Er = !1
            , Go = null
            , Yo = !1
            , Kl = null
            , qp = {
                onError: function (e) {
                    Er = !0,
                        Go = e
                }
            };
        function Zp(e, t, n, r, o, i, l, s, a) {
            Er = !1,
                Go = null,
                Xp.apply(qp, arguments)
        }
        function Jp(e, t, n, r, o, i, l, s, a) {
            if (Zp.apply(this, arguments),
                Er) {
                if (Er) {
                    var u = Go;
                    Er = !1,
                        Go = null
                } else
                    throw Error(N(198));
                Yo || (Yo = !0,
                    Kl = u)
            }
        }
        function wn(e) {
            var t = e
                , n = e;
            if (e.alternate)
                for (; t.return;)
                    t = t.return;
            else {
                e = t;
                do
                    t = e,
                        (t.flags & 4098) !== 0 && (n = t.return),
                        e = t.return;
                while (e)
            }
            return t.tag === 3 ? n : null
        }
        function Ac(e) {
            if (e.tag === 13) {
                var t = e.memoizedState;
                if (t === null && (e = e.alternate,
                    e !== null && (t = e.memoizedState)),
                    t !== null)
                    return t.dehydrated
            }
            return null
        }
        function Nu(e) {
            if (wn(e) !== e)
                throw Error(N(188))
        }
        function bp(e) {
            var t = e.alternate;
            if (!t) {
                if (t = wn(e),
                    t === null)
                    throw Error(N(188));
                return t !== e ? null : e
            }
            for (var n = e, r = t; ;) {
                var o = n.return;
                if (o === null)
                    break;
                var i = o.alternate;
                if (i === null) {
                    if (r = o.return,
                        r !== null) {
                        n = r;
                        continue
                    }
                    break
                }
                if (o.child === i.child) {
                    for (i = o.child; i;) {
                        if (i === n)
                            return Nu(o),
                                e;
                        if (i === r)
                            return Nu(o),
                                t;
                        i = i.sibling
                    }
                    throw Error(N(188))
                }
                if (n.return !== r.return)
                    n = o,
                        r = i;
                else {
                    for (var l = !1, s = o.child; s;) {
                        if (s === n) {
                            l = !0,
                                n = o,
                                r = i;
                            break
                        }
                        if (s === r) {
                            l = !0,
                                r = o,
                                n = i;
                            break
                        }
                        s = s.sibling
                    }
                    if (!l) {
                        for (s = i.child; s;) {
                            if (s === n) {
                                l = !0,
                                    n = i,
                                    r = o;
                                break
                            }
                            if (s === r) {
                                l = !0,
                                    r = i,
                                    n = o;
                                break
                            }
                            s = s.sibling
                        }
                        if (!l)
                            throw Error(N(189))
                    }
                }
                if (n.alternate !== r)
                    throw Error(N(190))
            }
            if (n.tag !== 3)
                throw Error(N(188));
            return n.stateNode.current === n ? e : t
        }
        function Bc(e) {
            return e = bp(e),
                e !== null ? Wc(e) : null
        }
        function Wc(e) {
            if (e.tag === 5 || e.tag === 6)
                return e;
            for (e = e.child; e !== null;) {
                var t = Wc(e);
                if (t !== null)
                    return t;
                e = e.sibling
            }
            return null
        }
        var Uc = Fe.unstable_scheduleCallback
            , Eu = Fe.unstable_cancelCallback
            , em = Fe.unstable_shouldYield
            , tm = Fe.unstable_requestPaint
            , te = Fe.unstable_now
            , nm = Fe.unstable_getCurrentPriorityLevel
            , Ls = Fe.unstable_ImmediatePriority
            , jc = Fe.unstable_UserBlockingPriority
            , Xo = Fe.unstable_NormalPriority
            , rm = Fe.unstable_LowPriority
            , Vc = Fe.unstable_IdlePriority
            , vi = null
            , at = null;
        function om(e) {
            if (at && typeof at.onCommitFiberRoot == "function")
                try {
                    at.onCommitFiberRoot(vi, e, void 0, (e.current.flags & 128) === 128)
                } catch { }
        }
        var Je = Math.clz32 ? Math.clz32 : sm
            , im = Math.log
            , lm = Math.LN2;
        function sm(e) {
            return e >>>= 0,
                e === 0 ? 32 : 31 - (im(e) / lm | 0) | 0
        }
        var ko = 64
            , So = 4194304;
        function kr(e) {
            switch (e & -e) {
                case 1:
                    return 1;
                case 2:
                    return 2;
                case 4:
                    return 4;
                case 8:
                    return 8;
                case 16:
                    return 16;
                case 32:
                    return 32;
                case 64:
                case 128:
                case 256:
                case 512:
                case 1024:
                case 2048:
                case 4096:
                case 8192:
                case 16384:
                case 32768:
                case 65536:
                case 131072:
                case 262144:
                case 524288:
                case 1048576:
                case 2097152:
                    return e & 4194240;
                case 4194304:
                case 8388608:
                case 16777216:
                case 33554432:
                case 67108864:
                    return e & 130023424;
                case 134217728:
                    return 134217728;
                case 268435456:
                    return 268435456;
                case 536870912:
                    return 536870912;
                case 1073741824:
                    return 1073741824;
                default:
                    return e
            }
        }
        function qo(e, t) {
            var n = e.pendingLanes;
            if (n === 0)
                return 0;
            var r = 0
                , o = e.suspendedLanes
                , i = e.pingedLanes
                , l = n & 268435455;
            if (l !== 0) {
                var s = l & ~o;
                s !== 0 ? r = kr(s) : (i &= l,
                    i !== 0 && (r = kr(i)))
            } else
                l = n & ~o,
                    l !== 0 ? r = kr(l) : i !== 0 && (r = kr(i));
            if (r === 0)
                return 0;
            if (t !== 0 && t !== r && (t & o) === 0 && (o = r & -r,
                i = t & -t,
                o >= i || o === 16 && (i & 4194240) !== 0))
                return t;
            if ((r & 4) !== 0 && (r |= n & 16),
                t = e.entangledLanes,
                t !== 0)
                for (e = e.entanglements,
                    t &= r; 0 < t;)
                    n = 31 - Je(t),
                        o = 1 << n,
                        r |= e[n],
                        t &= ~o;
            return r
        }
        function am(e, t) {
            switch (e) {
                case 1:
                case 2:
                case 4:
                    return t + 250;
                case 8:
                case 16:
                case 32:
                case 64:
                case 128:
                case 256:
                case 512:
                case 1024:
                case 2048:
                case 4096:
                case 8192:
                case 16384:
                case 32768:
                case 65536:
                case 131072:
                case 262144:
                case 524288:
                case 1048576:
                case 2097152:
                    return t + 5e3;
                case 4194304:
                case 8388608:
                case 16777216:
                case 33554432:
                case 67108864:
                    return -1;
                case 134217728:
                case 268435456:
                case 536870912:
                case 1073741824:
                    return -1;
                default:
                    return -1
            }
        }
        function um(e, t) {
            for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, i = e.pendingLanes; 0 < i;) {
                var l = 31 - Je(i)
                    , s = 1 << l
                    , a = o[l];
                a === -1 ? ((s & n) === 0 || (s & r) !== 0) && (o[l] = am(s, t)) : a <= t && (e.expiredLanes |= s),
                    i &= ~s
            }
        }
        function Gl(e) {
            return e = e.pendingLanes & -1073741825,
                e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
        }
        function Hc() {
            var e = ko;
            return ko <<= 1,
                (ko & 4194240) === 0 && (ko = 64),
                e
        }
        function pl(e) {
            for (var t = [], n = 0; 31 > n; n++)
                t.push(e);
            return t
        }
        function Yr(e, t, n) {
            e.pendingLanes |= t,
                t !== 536870912 && (e.suspendedLanes = 0,
                    e.pingedLanes = 0),
                e = e.eventTimes,
                t = 31 - Je(t),
                e[t] = n
        }
        function cm(e, t) {
            var n = e.pendingLanes & ~t;
            e.pendingLanes = t,
                e.suspendedLanes = 0,
                e.pingedLanes = 0,
                e.expiredLanes &= t,
                e.mutableReadLanes &= t,
                e.entangledLanes &= t,
                t = e.entanglements;
            var r = e.eventTimes;
            for (e = e.expirationTimes; 0 < n;) {
                var o = 31 - Je(n)
                    , i = 1 << o;
                t[o] = 0,
                    r[o] = -1,
                    e[o] = -1,
                    n &= ~i
            }
        }
        function zs(e, t) {
            var n = e.entangledLanes |= t;
            for (e = e.entanglements; n;) {
                var r = 31 - Je(n)
                    , o = 1 << r;
                o & t | e[r] & t && (e[r] |= t),
                    n &= ~o
            }
        }
        var U = 0;
        function $c(e) {
            return e &= -e,
                1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1
        }
        var Qc, Rs, Kc, Gc, Yc, Yl = !1, No = [], Ut = null, jt = null, Vt = null, Fr = new Map, Dr = new Map, Ot = [], dm = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
        function Cu(e, t) {
            switch (e) {
                case "focusin":
                case "focusout":
                    Ut = null;
                    break;
                case "dragenter":
                case "dragleave":
                    jt = null;
                    break;
                case "mouseover":
                case "mouseout":
                    Vt = null;
                    break;
                case "pointerover":
                case "pointerout":
                    Fr.delete(t.pointerId);
                    break;
                case "gotpointercapture":
                case "lostpointercapture":
                    Dr.delete(t.pointerId)
            }
        }
        function dr(e, t, n, r, o, i) {
            return e === null || e.nativeEvent !== i ? (e = {
                blockedOn: t,
                domEventName: n,
                eventSystemFlags: r,
                nativeEvent: i,
                targetContainers: [o]
            },
                t !== null && (t = qr(t),
                    t !== null && Rs(t)),
                e) : (e.eventSystemFlags |= r,
                    t = e.targetContainers,
                    o !== null && t.indexOf(o) === -1 && t.push(o),
                    e)
        }
        function fm(e, t, n, r, o) {
            switch (t) {
                case "focusin":
                    return Ut = dr(Ut, e, t, n, r, o),
                        !0;
                case "dragenter":
                    return jt = dr(jt, e, t, n, r, o),
                        !0;
                case "mouseover":
                    return Vt = dr(Vt, e, t, n, r, o),
                        !0;
                case "pointerover":
                    var i = o.pointerId;
                    return Fr.set(i, dr(Fr.get(i) || null, e, t, n, r, o)),
                        !0;
                case "gotpointercapture":
                    return i = o.pointerId,
                        Dr.set(i, dr(Dr.get(i) || null, e, t, n, r, o)),
                        !0
            }
            return !1
        }
        function Xc(e) {
            var t = an(e.target);
            if (t !== null) {
                var n = wn(t);
                if (n !== null) {
                    if (t = n.tag,
                        t === 13) {
                        if (t = Ac(n),
                            t !== null) {
                            e.blockedOn = t,
                                Yc(e.priority, function () {
                                    Kc(n)
                                });
                            return
                        }
                    } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
                        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
                        return
                    }
                }
            }
            e.blockedOn = null
        }
        function Oo(e) {
            if (e.blockedOn !== null)
                return !1;
            for (var t = e.targetContainers; 0 < t.length;) {
                var n = Xl(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
                if (n === null) {
                    n = e.nativeEvent;
                    var r = new n.constructor(n.type, n);
                    Hl = r,
                        n.target.dispatchEvent(r),
                        Hl = null
                } else
                    return t = qr(n),
                        t !== null && Rs(t),
                        e.blockedOn = n,
                        !1;
                t.shift()
            }
            return !0
        }
        function _u(e, t, n) {
            Oo(e) && n.delete(t)
        }
        function pm() {
            Yl = !1,
                Ut !== null && Oo(Ut) && (Ut = null),
                jt !== null && Oo(jt) && (jt = null),
                Vt !== null && Oo(Vt) && (Vt = null),
                Fr.forEach(_u),
                Dr.forEach(_u)
        }
        function fr(e, t) {
            e.blockedOn === t && (e.blockedOn = null,
                Yl || (Yl = !0,
                    Fe.unstable_scheduleCallback(Fe.unstable_NormalPriority, pm)))
        }
        function Or(e) {
            function t(o) {
                return fr(o, e)
            }
            if (0 < No.length) {
                fr(No[0], e);
                for (var n = 1; n < No.length; n++) {
                    var r = No[n];
                    r.blockedOn === e && (r.blockedOn = null)
                }
            }
            for (Ut !== null && fr(Ut, e),
                jt !== null && fr(jt, e),
                Vt !== null && fr(Vt, e),
                Fr.forEach(t),
                Dr.forEach(t),
                n = 0; n < Ot.length; n++)
                r = Ot[n],
                    r.blockedOn === e && (r.blockedOn = null);
            for (; 0 < Ot.length && (n = Ot[0],
                n.blockedOn === null);)
                Xc(n),
                    n.blockedOn === null && Ot.shift()
        }
        var Hn = Pt.ReactCurrentBatchConfig
            , Zo = !0;
        function mm(e, t, n, r) {
            var o = U
                , i = Hn.transition;
            Hn.transition = null;
            try {
                U = 1,
                    Is(e, t, n, r)
            } finally {
                U = o,
                    Hn.transition = i
            }
        }
        function hm(e, t, n, r) {
            var o = U
                , i = Hn.transition;
            Hn.transition = null;
            try {
                U = 4,
                    Is(e, t, n, r)
            } finally {
                U = o,
                    Hn.transition = i
            }
        }
        function Is(e, t, n, r) {
            if (Zo) {
                var o = Xl(e, t, n, r);
                if (o === null)
                    kl(e, t, r, Jo, n),
                        Cu(e, r);
                else if (fm(o, e, t, n, r))
                    r.stopPropagation();
                else if (Cu(e, r),
                    t & 4 && -1 < dm.indexOf(e)) {
                    for (; o !== null;) {
                        var i = qr(o);
                        if (i !== null && Qc(i),
                            i = Xl(e, t, n, r),
                            i === null && kl(e, t, r, Jo, n),
                            i === o)
                            break;
                        o = i
                    }
                    o !== null && r.stopPropagation()
                } else
                    kl(e, t, r, null, n)
            }
        }
        var Jo = null;
        function Xl(e, t, n, r) {
            if (Jo = null,
                e = Ms(r),
                e = an(e),
                e !== null)
                if (t = wn(e),
                    t === null)
                    e = null;
                else if (n = t.tag,
                    n === 13) {
                    if (e = Ac(t),
                        e !== null)
                        return e;
                    e = null
                } else if (n === 3) {
                    if (t.stateNode.current.memoizedState.isDehydrated)
                        return t.tag === 3 ? t.stateNode.containerInfo : null;
                    e = null
                } else
                    t !== e && (e = null);
            return Jo = e,
                null
        }
        function qc(e) {
            switch (e) {
                case "cancel":
                case "click":
                case "close":
                case "contextmenu":
                case "copy":
                case "cut":
                case "auxclick":
                case "dblclick":
                case "dragend":
                case "dragstart":
                case "drop":
                case "focusin":
                case "focusout":
                case "input":
                case "invalid":
                case "keydown":
                case "keypress":
                case "keyup":
                case "mousedown":
                case "mouseup":
                case "paste":
                case "pause":
                case "play":
                case "pointercancel":
                case "pointerdown":
                case "pointerup":
                case "ratechange":
                case "reset":
                case "resize":
                case "seeked":
                case "submit":
                case "touchcancel":
                case "touchend":
                case "touchstart":
                case "volumechange":
                case "change":
                case "selectionchange":
                case "textInput":
                case "compositionstart":
                case "compositionend":
                case "compositionupdate":
                case "beforeblur":
                case "afterblur":
                case "beforeinput":
                case "blur":
                case "fullscreenchange":
                case "focus":
                case "hashchange":
                case "popstate":
                case "select":
                case "selectstart":
                    return 1;
                case "drag":
                case "dragenter":
                case "dragexit":
                case "dragleave":
                case "dragover":
                case "mousemove":
                case "mouseout":
                case "mouseover":
                case "pointermove":
                case "pointerout":
                case "pointerover":
                case "scroll":
                case "toggle":
                case "touchmove":
                case "wheel":
                case "mouseenter":
                case "mouseleave":
                case "pointerenter":
                case "pointerleave":
                    return 4;
                case "message":
                    switch (nm()) {
                        case Ls:
                            return 1;
                        case jc:
                            return 4;
                        case Xo:
                        case rm:
                            return 16;
                        case Vc:
                            return 536870912;
                        default:
                            return 16
                    }
                default:
                    return 16
            }
        }
        var Bt = null
            , Fs = null
            , Ao = null;
        function Zc() {
            if (Ao)
                return Ao;
            var e, t = Fs, n = t.length, r, o = "value" in Bt ? Bt.value : Bt.textContent, i = o.length;
            for (e = 0; e < n && t[e] === o[e]; e++)
                ;
            var l = n - e;
            for (r = 1; r <= l && t[n - r] === o[i - r]; r++)
                ;
            return Ao = o.slice(e, 1 < r ? 1 - r : void 0)
        }
        function Bo(e) {
            var t = e.keyCode;
            return "charCode" in e ? (e = e.charCode,
                e === 0 && t === 13 && (e = 13)) : e = t,
                e === 10 && (e = 13),
                32 <= e || e === 13 ? e : 0
        }
        function Eo() {
            return !0
        }
        function Pu() {
            return !1
        }
        function De(e) {
            function t(n, r, o, i, l) {
                this._reactName = n,
                    this._targetInst = o,
                    this.type = r,
                    this.nativeEvent = i,
                    this.target = l,
                    this.currentTarget = null;
                for (var s in e)
                    e.hasOwnProperty(s) && (n = e[s],
                        this[s] = n ? n(i) : i[s]);
                return this.isDefaultPrevented = (i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1) ? Eo : Pu,
                    this.isPropagationStopped = Pu,
                    this
            }
            return Z(t.prototype, {
                preventDefault: function () {
                    this.defaultPrevented = !0;
                    var n = this.nativeEvent;
                    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1),
                        this.isDefaultPrevented = Eo)
                },
                stopPropagation: function () {
                    var n = this.nativeEvent;
                    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0),
                        this.isPropagationStopped = Eo)
                },
                persist: function () { },
                isPersistent: Eo
            }),
                t
        }
        var bn = {
            eventPhase: 0,
            bubbles: 0,
            cancelable: 0,
            timeStamp: function (e) {
                return e.timeStamp || Date.now()
            },
            defaultPrevented: 0,
            isTrusted: 0
        }, Ds = De(bn), Xr = Z({}, bn, {
            view: 0,
            detail: 0
        }), vm = De(Xr), ml, hl, pr, yi = Z({}, Xr, {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            getModifierState: Os,
            button: 0,
            buttons: 0,
            relatedTarget: function (e) {
                return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget
            },
            movementX: function (e) {
                return "movementX" in e ? e.movementX : (e !== pr && (pr && e.type === "mousemove" ? (ml = e.screenX - pr.screenX,
                    hl = e.screenY - pr.screenY) : hl = ml = 0,
                    pr = e),
                    ml)
            },
            movementY: function (e) {
                return "movementY" in e ? e.movementY : hl
            }
        }), xu = De(yi), ym = Z({}, yi, {
            dataTransfer: 0
        }), gm = De(ym), wm = Z({}, Xr, {
            relatedTarget: 0
        }), vl = De(wm), km = Z({}, bn, {
            animationName: 0,
            elapsedTime: 0,
            pseudoElement: 0
        }), Sm = De(km), Nm = Z({}, bn, {
            clipboardData: function (e) {
                return "clipboardData" in e ? e.clipboardData : window.clipboardData
            }
        }), Em = De(Nm), Cm = Z({}, bn, {
            data: 0
        }), Tu = De(Cm), _m = {
            Esc: "Escape",
            Spacebar: " ",
            Left: "ArrowLeft",
            Up: "ArrowUp",
            Right: "ArrowRight",
            Down: "ArrowDown",
            Del: "Delete",
            Win: "OS",
            Menu: "ContextMenu",
            Apps: "ContextMenu",
            Scroll: "ScrollLock",
            MozPrintableKey: "Unidentified"
        }, Pm = {
            8: "Backspace",
            9: "Tab",
            12: "Clear",
            13: "Enter",
            16: "Shift",
            17: "Control",
            18: "Alt",
            19: "Pause",
            20: "CapsLock",
            27: "Escape",
            32: " ",
            33: "PageUp",
            34: "PageDown",
            35: "End",
            36: "Home",
            37: "ArrowLeft",
            38: "ArrowUp",
            39: "ArrowRight",
            40: "ArrowDown",
            45: "Insert",
            46: "Delete",
            112: "F1",
            113: "F2",
            114: "F3",
            115: "F4",
            116: "F5",
            117: "F6",
            118: "F7",
            119: "F8",
            120: "F9",
            121: "F10",
            122: "F11",
            123: "F12",
            144: "NumLock",
            145: "ScrollLock",
            224: "Meta"
        }, xm = {
            Alt: "altKey",
            Control: "ctrlKey",
            Meta: "metaKey",
            Shift: "shiftKey"
        };
        function Tm(e) {
            var t = this.nativeEvent;
            return t.getModifierState ? t.getModifierState(e) : (e = xm[e]) ? !!t[e] : !1
        }
        function Os() {
            return Tm
        }
        var Mm = Z({}, Xr, {
            key: function (e) {
                if (e.key) {
                    var t = _m[e.key] || e.key;
                    if (t !== "Unidentified")
                        return t
                }
                return e.type === "keypress" ? (e = Bo(e),
                    e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Pm[e.keyCode] || "Unidentified" : ""
            },
            code: 0,
            location: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            repeat: 0,
            locale: 0,
            getModifierState: Os,
            charCode: function (e) {
                return e.type === "keypress" ? Bo(e) : 0
            },
            keyCode: function (e) {
                return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
            },
            which: function (e) {
                return e.type === "keypress" ? Bo(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0
            }
        })
            , Lm = De(Mm)
            , zm = Z({}, yi, {
                pointerId: 0,
                width: 0,
                height: 0,
                pressure: 0,
                tangentialPressure: 0,
                tiltX: 0,
                tiltY: 0,
                twist: 0,
                pointerType: 0,
                isPrimary: 0
            })
            , Mu = De(zm)
            , Rm = Z({}, Xr, {
                touches: 0,
                targetTouches: 0,
                changedTouches: 0,
                altKey: 0,
                metaKey: 0,
                ctrlKey: 0,
                shiftKey: 0,
                getModifierState: Os
            })
            , Im = De(Rm)
            , Fm = Z({}, bn, {
                propertyName: 0,
                elapsedTime: 0,
                pseudoElement: 0
            })
            , Dm = De(Fm)
            , Om = Z({}, yi, {
                deltaX: function (e) {
                    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0
                },
                deltaY: function (e) {
                    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0
                },
                deltaZ: 0,
                deltaMode: 0
            })
            , Am = De(Om)
            , Bm = [9, 13, 27, 32]
            , As = Nt && "CompositionEvent" in window
            , Cr = null;
        Nt && "documentMode" in document && (Cr = document.documentMode);
        var Wm = Nt && "TextEvent" in window && !Cr
            , Jc = Nt && (!As || Cr && 8 < Cr && 11 >= Cr)
            , Lu = " "
            , zu = !1;
        function bc(e, t) {
            switch (e) {
                case "keyup":
                    return Bm.indexOf(t.keyCode) !== -1;
                case "keydown":
                    return t.keyCode !== 229;
                case "keypress":
                case "mousedown":
                case "focusout":
                    return !0;
                default:
                    return !1
            }
        }
        function ed(e) {
            return e = e.detail,
                typeof e == "object" && "data" in e ? e.data : null
        }
        var Ln = !1;
        function Um(e, t) {
            switch (e) {
                case "compositionend":
                    return ed(t);
                case "keypress":
                    return t.which !== 32 ? null : (zu = !0,
                        Lu);
                case "textInput":
                    return e = t.data,
                        e === Lu && zu ? null : e;
                default:
                    return null
            }
        }
        function jm(e, t) {
            if (Ln)
                return e === "compositionend" || !As && bc(e, t) ? (e = Zc(),
                    Ao = Fs = Bt = null,
                    Ln = !1,
                    e) : null;
            switch (e) {
                case "paste":
                    return null;
                case "keypress":
                    if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
                        if (t.char && 1 < t.char.length)
                            return t.char;
                        if (t.which)
                            return String.fromCharCode(t.which)
                    }
                    return null;
                case "compositionend":
                    return Jc && t.locale !== "ko" ? null : t.data;
                default:
                    return null
            }
        }
        var Vm = {
            color: !0,
            date: !0,
            datetime: !0,
            "datetime-local": !0,
            email: !0,
            month: !0,
            number: !0,
            password: !0,
            range: !0,
            search: !0,
            tel: !0,
            text: !0,
            time: !0,
            url: !0,
            week: !0
        };
        function Ru(e) {
            var t = e && e.nodeName && e.nodeName.toLowerCase();
            return t === "input" ? !!Vm[e.type] : t === "textarea"
        }
        function td(e, t, n, r) {
            Rc(r),
                t = bo(t, "onChange"),
                0 < t.length && (n = new Ds("onChange", "change", null, n, r),
                    e.push({
                        event: n,
                        listeners: t
                    }))
        }
        var _r = null
            , Ar = null;
        function Hm(e) {
            fd(e, 0)
        }
        function gi(e) {
            var t = In(e);
            if (_c(t))
                return e
        }
        function $m(e, t) {
            if (e === "change")
                return t
        }
        var nd = !1;
        Nt && (Nt ? (_o = "oninput" in document,
            _o || (yl = document.createElement("div"),
                yl.setAttribute("oninput", "return;"),
                _o = typeof yl.oninput == "function"),
            Co = _o) : Co = !1,
            nd = Co && (!document.documentMode || 9 < document.documentMode));
        var Co, _o, yl;
        function Iu() {
            _r && (_r.detachEvent("onpropertychange", rd),
                Ar = _r = null)
        }
        function rd(e) {
            if (e.propertyName === "value" && gi(Ar)) {
                var t = [];
                td(t, Ar, e, Ms(e)),
                    Oc(Hm, t)
            }
        }
        function Qm(e, t, n) {
            e === "focusin" ? (Iu(),
                _r = t,
                Ar = n,
                _r.attachEvent("onpropertychange", rd)) : e === "focusout" && Iu()
        }
        function Km(e) {
            if (e === "selectionchange" || e === "keyup" || e === "keydown")
                return gi(Ar)
        }
        function Gm(e, t) {
            if (e === "click")
                return gi(t)
        }
        function Ym(e, t) {
            if (e === "input" || e === "change")
                return gi(t)
        }
        function Xm(e, t) {
            return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t
        }
        var et = typeof Object.is == "function" ? Object.is : Xm;
        function Br(e, t) {
            if (et(e, t))
                return !0;
            if (typeof e != "object" || e === null || typeof t != "object" || t === null)
                return !1;
            var n = Object.keys(e)
                , r = Object.keys(t);
            if (n.length !== r.length)
                return !1;
            for (r = 0; r < n.length; r++) {
                var o = n[r];
                if (!zl.call(t, o) || !et(e[o], t[o]))
                    return !1
            }
            return !0
        }
        function Fu(e) {
            for (; e && e.firstChild;)
                e = e.firstChild;
            return e
        }
        function Du(e, t) {
            var n = Fu(e);
            e = 0;
            for (var r; n;) {
                if (n.nodeType === 3) {
                    if (r = e + n.textContent.length,
                        e <= t && r >= t)
                        return {
                            node: n,
                            offset: t - e
                        };
                    e = r
                }
                e: {
                    for (; n;) {
                        if (n.nextSibling) {
                            n = n.nextSibling;
                            break e
                        }
                        n = n.parentNode
                    }
                    n = void 0
                }
                n = Fu(n)
            }
        }
        function od(e, t) {
            return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? od(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1
        }
        function id() {
            for (var e = window, t = Ko(); t instanceof e.HTMLIFrameElement;) {
                try {
                    var n = typeof t.contentWindow.location.href == "string"
                } catch {
                    n = !1
                }
                if (n)
                    e = t.contentWindow;
                else
                    break;
                t = Ko(e.document)
            }
            return t
        }
        function Bs(e) {
            var t = e && e.nodeName && e.nodeName.toLowerCase();
            return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true")
        }
        function qm(e) {
            var t = id()
                , n = e.focusedElem
                , r = e.selectionRange;
            if (t !== n && n && n.ownerDocument && od(n.ownerDocument.documentElement, n)) {
                if (r !== null && Bs(n)) {
                    if (t = r.start,
                        e = r.end,
                        e === void 0 && (e = t),
                        "selectionStart" in n)
                        n.selectionStart = t,
                            n.selectionEnd = Math.min(e, n.value.length);
                    else if (e = (t = n.ownerDocument || document) && t.defaultView || window,
                        e.getSelection) {
                        e = e.getSelection();
                        var o = n.textContent.length
                            , i = Math.min(r.start, o);
                        r = r.end === void 0 ? i : Math.min(r.end, o),
                            !e.extend && i > r && (o = r,
                                r = i,
                                i = o),
                            o = Du(n, i);
                        var l = Du(n, r);
                        o && l && (e.rangeCount !== 1 || e.anchorNode !== o.node || e.anchorOffset !== o.offset || e.focusNode !== l.node || e.focusOffset !== l.offset) && (t = t.createRange(),
                            t.setStart(o.node, o.offset),
                            e.removeAllRanges(),
                            i > r ? (e.addRange(t),
                                e.extend(l.node, l.offset)) : (t.setEnd(l.node, l.offset),
                                    e.addRange(t)))
                    }
                }
                for (t = [],
                    e = n; e = e.parentNode;)
                    e.nodeType === 1 && t.push({
                        element: e,
                        left: e.scrollLeft,
                        top: e.scrollTop
                    });
                for (typeof n.focus == "function" && n.focus(),
                    n = 0; n < t.length; n++)
                    e = t[n],
                        e.element.scrollLeft = e.left,
                        e.element.scrollTop = e.top
            }
        }
        var Zm = Nt && "documentMode" in document && 11 >= document.documentMode
            , zn = null
            , ql = null
            , Pr = null
            , Zl = !1;
        function Ou(e, t, n) {
            var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
            Zl || zn == null || zn !== Ko(r) || (r = zn,
                "selectionStart" in r && Bs(r) ? r = {
                    start: r.selectionStart,
                    end: r.selectionEnd
                } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(),
                    r = {
                        anchorNode: r.anchorNode,
                        anchorOffset: r.anchorOffset,
                        focusNode: r.focusNode,
                        focusOffset: r.focusOffset
                    }),
                Pr && Br(Pr, r) || (Pr = r,
                    r = bo(ql, "onSelect"),
                    0 < r.length && (t = new Ds("onSelect", "select", null, t, n),
                        e.push({
                            event: t,
                            listeners: r
                        }),
                        t.target = zn)))
        }
        function Po(e, t) {
            var n = {};
            return n[e.toLowerCase()] = t.toLowerCase(),
                n["Webkit" + e] = "webkit" + t,
                n["Moz" + e] = "moz" + t,
                n
        }
        var Rn = {
            animationend: Po("Animation", "AnimationEnd"),
            animationiteration: Po("Animation", "AnimationIteration"),
            animationstart: Po("Animation", "AnimationStart"),
            transitionend: Po("Transition", "TransitionEnd")
        }
            , gl = {}
            , ld = {};
        Nt && (ld = document.createElement("div").style,
            "AnimationEvent" in window || (delete Rn.animationend.animation,
                delete Rn.animationiteration.animation,
                delete Rn.animationstart.animation),
            "TransitionEvent" in window || delete Rn.transitionend.transition);
        function wi(e) {
            if (gl[e])
                return gl[e];
            if (!Rn[e])
                return e;
            var t = Rn[e], n;
            for (n in t)
                if (t.hasOwnProperty(n) && n in ld)
                    return gl[e] = t[n];
            return e
        }
        var sd = wi("animationend")
            , ad = wi("animationiteration")
            , ud = wi("animationstart")
            , cd = wi("transitionend")
            , dd = new Map
            , Au = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
        function qt(e, t) {
            dd.set(e, t),
                gn(t, [e])
        }
        for (xo = 0; xo < Au.length; xo++)
            To = Au[xo],
                Bu = To.toLowerCase(),
                Wu = To[0].toUpperCase() + To.slice(1),
                qt(Bu, "on" + Wu);
        var To, Bu, Wu, xo;
        qt(sd, "onAnimationEnd");
        qt(ad, "onAnimationIteration");
        qt(ud, "onAnimationStart");
        qt("dblclick", "onDoubleClick");
        qt("focusin", "onFocus");
        qt("focusout", "onBlur");
        qt(cd, "onTransitionEnd");
        Kn("onMouseEnter", ["mouseout", "mouseover"]);
        Kn("onMouseLeave", ["mouseout", "mouseover"]);
        Kn("onPointerEnter", ["pointerout", "pointerover"]);
        Kn("onPointerLeave", ["pointerout", "pointerover"]);
        gn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
        gn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
        gn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
        gn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
        gn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
        gn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
        var Sr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" ")
            , Jm = new Set("cancel close invalid load scroll toggle".split(" ").concat(Sr));
        function Uu(e, t, n) {
            var r = e.type || "unknown-event";
            e.currentTarget = n,
                Jp(r, t, void 0, e),
                e.currentTarget = null
        }
        function fd(e, t) {
            t = (t & 4) !== 0;
            for (var n = 0; n < e.length; n++) {
                var r = e[n]
                    , o = r.event;
                r = r.listeners;
                e: {
                    var i = void 0;
                    if (t)
                        for (var l = r.length - 1; 0 <= l; l--) {
                            var s = r[l]
                                , a = s.instance
                                , u = s.currentTarget;
                            if (s = s.listener,
                                a !== i && o.isPropagationStopped())
                                break e;
                            Uu(o, s, u),
                                i = a
                        }
                    else
                        for (l = 0; l < r.length; l++) {
                            if (s = r[l],
                                a = s.instance,
                                u = s.currentTarget,
                                s = s.listener,
                                a !== i && o.isPropagationStopped())
                                break e;
                            Uu(o, s, u),
                                i = a
                        }
                }
            }
            if (Yo)
                throw e = Kl,
                Yo = !1,
                Kl = null,
                e
        }
        function Q(e, t) {
            var n = t[ns];
            n === void 0 && (n = t[ns] = new Set);
            var r = e + "__bubble";
            n.has(r) || (pd(t, e, 2, !1),
                n.add(r))
        }
        function wl(e, t, n) {
            var r = 0;
            t && (r |= 4),
                pd(n, e, r, t)
        }
        var Mo = "_reactListening" + Math.random().toString(36).slice(2);
        function Wr(e) {
            if (!e[Mo]) {
                e[Mo] = !0,
                    kc.forEach(function (n) {
                        n !== "selectionchange" && (Jm.has(n) || wl(n, !1, e),
                            wl(n, !0, e))
                    });
                var t = e.nodeType === 9 ? e : e.ownerDocument;
                t === null || t[Mo] || (t[Mo] = !0,
                    wl("selectionchange", !1, t))
            }
        }
        function pd(e, t, n, r) {
            switch (qc(t)) {
                case 1:
                    var o = mm;
                    break;
                case 4:
                    o = hm;
                    break;
                default:
                    o = Is
            }
            n = o.bind(null, t, n, e),
                o = void 0,
                !Ql || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0),
                r ? o !== void 0 ? e.addEventListener(t, n, {
                    capture: !0,
                    passive: o
                }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, {
                    passive: o
                }) : e.addEventListener(t, n, !1)
        }
        function kl(e, t, n, r, o) {
            var i = r;
            if ((t & 1) === 0 && (t & 2) === 0 && r !== null)
                e: for (; ;) {
                    if (r === null)
                        return;
                    var l = r.tag;
                    if (l === 3 || l === 4) {
                        var s = r.stateNode.containerInfo;
                        if (s === o || s.nodeType === 8 && s.parentNode === o)
                            break;
                        if (l === 4)
                            for (l = r.return; l !== null;) {
                                var a = l.tag;
                                if ((a === 3 || a === 4) && (a = l.stateNode.containerInfo,
                                    a === o || a.nodeType === 8 && a.parentNode === o))
                                    return;
                                l = l.return
                            }
                        for (; s !== null;) {
                            if (l = an(s),
                                l === null)
                                return;
                            if (a = l.tag,
                                a === 5 || a === 6) {
                                r = i = l;
                                continue e
                            }
                            s = s.parentNode
                        }
                    }
                    r = r.return
                }
            Oc(function () {
                var u = i
                    , d = Ms(n)
                    , h = [];
                e: {
                    var m = dd.get(e);
                    if (m !== void 0) {
                        var v = Ds
                            , y = e;
                        switch (e) {
                            case "keypress":
                                if (Bo(n) === 0)
                                    break e;
                            case "keydown":
                            case "keyup":
                                v = Lm;
                                break;
                            case "focusin":
                                y = "focus",
                                    v = vl;
                                break;
                            case "focusout":
                                y = "blur",
                                    v = vl;
                                break;
                            case "beforeblur":
                            case "afterblur":
                                v = vl;
                                break;
                            case "click":
                                if (n.button === 2)
                                    break e;
                            case "auxclick":
                            case "dblclick":
                            case "mousedown":
                            case "mousemove":
                            case "mouseup":
                            case "mouseout":
                            case "mouseover":
                            case "contextmenu":
                                v = xu;
                                break;
                            case "drag":
                            case "dragend":
                            case "dragenter":
                            case "dragexit":
                            case "dragleave":
                            case "dragover":
                            case "dragstart":
                            case "drop":
                                v = gm;
                                break;
                            case "touchcancel":
                            case "touchend":
                            case "touchmove":
                            case "touchstart":
                                v = Im;
                                break;
                            case sd:
                            case ad:
                            case ud:
                                v = Sm;
                                break;
                            case cd:
                                v = Dm;
                                break;
                            case "scroll":
                                v = vm;
                                break;
                            case "wheel":
                                v = Am;
                                break;
                            case "copy":
                            case "cut":
                            case "paste":
                                v = Em;
                                break;
                            case "gotpointercapture":
                            case "lostpointercapture":
                            case "pointercancel":
                            case "pointerdown":
                            case "pointermove":
                            case "pointerout":
                            case "pointerover":
                            case "pointerup":
                                v = Mu
                        }
                        var S = (t & 4) !== 0
                            , L = !S && e === "scroll"
                            , f = S ? m !== null ? m + "Capture" : null : m;
                        S = [];
                        for (var c = u, p; c !== null;) {
                            p = c;
                            var g = p.stateNode;
                            if (p.tag === 5 && g !== null && (p = g,
                                f !== null && (g = Ir(c, f),
                                    g != null && S.push(Ur(c, g, p)))),
                                L)
                                break;
                            c = c.return
                        }
                        0 < S.length && (m = new v(m, y, null, n, d),
                            h.push({
                                event: m,
                                listeners: S
                            }))
                    }
                }
                if ((t & 7) === 0) {
                    e: {
                        if (m = e === "mouseover" || e === "pointerover",
                            v = e === "mouseout" || e === "pointerout",
                            m && n !== Hl && (y = n.relatedTarget || n.fromElement) && (an(y) || y[Et]))
                            break e;
                        if ((v || m) && (m = d.window === d ? d : (m = d.ownerDocument) ? m.defaultView || m.parentWindow : window,
                            v ? (y = n.relatedTarget || n.toElement,
                                v = u,
                                y = y ? an(y) : null,
                                y !== null && (L = wn(y),
                                    y !== L || y.tag !== 5 && y.tag !== 6) && (y = null)) : (v = null,
                                        y = u),
                            v !== y)) {
                            if (S = xu,
                                g = "onMouseLeave",
                                f = "onMouseEnter",
                                c = "mouse",
                                (e === "pointerout" || e === "pointerover") && (S = Mu,
                                    g = "onPointerLeave",
                                    f = "onPointerEnter",
                                    c = "pointer"),
                                L = v == null ? m : In(v),
                                p = y == null ? m : In(y),
                                m = new S(g, c + "leave", v, n, d),
                                m.target = L,
                                m.relatedTarget = p,
                                g = null,
                                an(d) === u && (S = new S(f, c + "enter", y, n, d),
                                    S.target = p,
                                    S.relatedTarget = L,
                                    g = S),
                                L = g,
                                v && y)
                                t: {
                                    for (S = v,
                                        f = y,
                                        c = 0,
                                        p = S; p; p = xn(p))
                                        c++;
                                    for (p = 0,
                                        g = f; g; g = xn(g))
                                        p++;
                                    for (; 0 < c - p;)
                                        S = xn(S),
                                            c--;
                                    for (; 0 < p - c;)
                                        f = xn(f),
                                            p--;
                                    for (; c--;) {
                                        if (S === f || f !== null && S === f.alternate)
                                            break t;
                                        S = xn(S),
                                            f = xn(f)
                                    }
                                    S = null
                                }
                            else
                                S = null;
                            v !== null && ju(h, m, v, S, !1),
                                y !== null && L !== null && ju(h, L, y, S, !0)
                        }
                    }
                    e: {
                        if (m = u ? In(u) : window,
                            v = m.nodeName && m.nodeName.toLowerCase(),
                            v === "select" || v === "input" && m.type === "file")
                            var P = $m;
                        else if (Ru(m))
                            if (nd)
                                P = Ym;
                            else {
                                P = Km;
                                var _ = Qm
                            }
                        else
                            (v = m.nodeName) && v.toLowerCase() === "input" && (m.type === "checkbox" || m.type === "radio") && (P = Gm);
                        if (P && (P = P(e, u))) {
                            td(h, P, n, d);
                            break e
                        }
                        _ && _(e, m, u),
                            e === "focusout" && (_ = m._wrapperState) && _.controlled && m.type === "number" && Bl(m, "number", m.value)
                    }
                    switch (_ = u ? In(u) : window,
                    e) {
                        case "focusin":
                            (Ru(_) || _.contentEditable === "true") && (zn = _,
                                ql = u,
                                Pr = null);
                            break;
                        case "focusout":
                            Pr = ql = zn = null;
                            break;
                        case "mousedown":
                            Zl = !0;
                            break;
                        case "contextmenu":
                        case "mouseup":
                        case "dragend":
                            Zl = !1,
                                Ou(h, n, d);
                            break;
                        case "selectionchange":
                            if (Zm)
                                break;
                        case "keydown":
                        case "keyup":
                            Ou(h, n, d)
                    }
                    var w;
                    if (As)
                        e: {
                            switch (e) {
                                case "compositionstart":
                                    var C = "onCompositionStart";
                                    break e;
                                case "compositionend":
                                    C = "onCompositionEnd";
                                    break e;
                                case "compositionupdate":
                                    C = "onCompositionUpdate";
                                    break e
                            }
                            C = void 0
                        }
                    else
                        Ln ? bc(e, n) && (C = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (C = "onCompositionStart");
                    C && (Jc && n.locale !== "ko" && (Ln || C !== "onCompositionStart" ? C === "onCompositionEnd" && Ln && (w = Zc()) : (Bt = d,
                        Fs = "value" in Bt ? Bt.value : Bt.textContent,
                        Ln = !0)),
                        _ = bo(u, C),
                        0 < _.length && (C = new Tu(C, e, null, n, d),
                            h.push({
                                event: C,
                                listeners: _
                            }),
                            w ? C.data = w : (w = ed(n),
                                w !== null && (C.data = w)))),
                        (w = Wm ? Um(e, n) : jm(e, n)) && (u = bo(u, "onBeforeInput"),
                            0 < u.length && (d = new Tu("onBeforeInput", "beforeinput", null, n, d),
                                h.push({
                                    event: d,
                                    listeners: u
                                }),
                                d.data = w))
                }
                fd(h, t)
            })
        }
        function Ur(e, t, n) {
            return {
                instance: e,
                listener: t,
                currentTarget: n
            }
        }
        function bo(e, t) {
            for (var n = t + "Capture", r = []; e !== null;) {
                var o = e
                    , i = o.stateNode;
                o.tag === 5 && i !== null && (o = i,
                    i = Ir(e, n),
                    i != null && r.unshift(Ur(e, i, o)),
                    i = Ir(e, t),
                    i != null && r.push(Ur(e, i, o))),
                    e = e.return
            }
            return r
        }
        function xn(e) {
            if (e === null)
                return null;
            do
                e = e.return;
            while (e && e.tag !== 5);
            return e || null
        }
        function ju(e, t, n, r, o) {
            for (var i = t._reactName, l = []; n !== null && n !== r;) {
                var s = n
                    , a = s.alternate
                    , u = s.stateNode;
                if (a !== null && a === r)
                    break;
                s.tag === 5 && u !== null && (s = u,
                    o ? (a = Ir(n, i),
                        a != null && l.unshift(Ur(n, a, s))) : o || (a = Ir(n, i),
                            a != null && l.push(Ur(n, a, s)))),
                    n = n.return
            }
            l.length !== 0 && e.push({
                event: t,
                listeners: l
            })
        }
        var bm = /\r\n?/g
            , eh = /\u0000|\uFFFD/g;
        function Vu(e) {
            return (typeof e == "string" ? e : "" + e).replace(bm, `
`).replace(eh, "")
        }
        function Lo(e, t, n) {
            if (t = Vu(t),
                Vu(e) !== t && n)
                throw Error(N(425))
        }
        function ei() { }
        var Jl = null
            , bl = null;
        function es(e, t) {
            return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null
        }
        var ts = typeof setTimeout == "function" ? setTimeout : void 0
            , th = typeof clearTimeout == "function" ? clearTimeout : void 0
            , Hu = typeof Promise == "function" ? Promise : void 0
            , nh = typeof queueMicrotask == "function" ? queueMicrotask : typeof Hu < "u" ? function (e) {
                return Hu.resolve(null).then(e).catch(rh)
            }
                : ts;
        function rh(e) {
            setTimeout(function () {
                throw e
            })
        }
        function Sl(e, t) {
            var n = t
                , r = 0;
            do {
                var o = n.nextSibling;
                if (e.removeChild(n),
                    o && o.nodeType === 8)
                    if (n = o.data,
                        n === "/$") {
                        if (r === 0) {
                            e.removeChild(o),
                                Or(t);
                            return
                        }
                        r--
                    } else
                        n !== "$" && n !== "$?" && n !== "$!" || r++;
                n = o
            } while (n);
            Or(t)
        }
        function Ht(e) {
            for (; e != null; e = e.nextSibling) {
                var t = e.nodeType;
                if (t === 1 || t === 3)
                    break;
                if (t === 8) {
                    if (t = e.data,
                        t === "$" || t === "$!" || t === "$?")
                        break;
                    if (t === "/$")
                        return null
                }
            }
            return e
        }
        function $u(e) {
            e = e.previousSibling;
            for (var t = 0; e;) {
                if (e.nodeType === 8) {
                    var n = e.data;
                    if (n === "$" || n === "$!" || n === "$?") {
                        if (t === 0)
                            return e;
                        t--
                    } else
                        n === "/$" && t++
                }
                e = e.previousSibling
            }
            return null
        }
        var er = Math.random().toString(36).slice(2)
            , st = "__reactFiber$" + er
            , jr = "__reactProps$" + er
            , Et = "__reactContainer$" + er
            , ns = "__reactEvents$" + er
            , oh = "__reactListeners$" + er
            , ih = "__reactHandles$" + er;
        function an(e) {
            var t = e[st];
            if (t)
                return t;
            for (var n = e.parentNode; n;) {
                if (t = n[Et] || n[st]) {
                    if (n = t.alternate,
                        t.child !== null || n !== null && n.child !== null)
                        for (e = $u(e); e !== null;) {
                            if (n = e[st])
                                return n;
                            e = $u(e)
                        }
                    return t
                }
                e = n,
                    n = e.parentNode
            }
            return null
        }
        function qr(e) {
            return e = e[st] || e[Et],
                !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e
        }
        function In(e) {
            if (e.tag === 5 || e.tag === 6)
                return e.stateNode;
            throw Error(N(33))
        }
        function ki(e) {
            return e[jr] || null
        }
        var rs = []
            , Fn = -1;
        function Zt(e) {
            return {
                current: e
            }
        }
        function K(e) {
            0 > Fn || (e.current = rs[Fn],
                rs[Fn] = null,
                Fn--)
        }
        function $(e, t) {
            Fn++,
                rs[Fn] = e.current,
                e.current = t
        }
        var Xt = {}
            , ye = Zt(Xt)
            , xe = Zt(!1)
            , pn = Xt;
        function Gn(e, t) {
            var n = e.type.contextTypes;
            if (!n)
                return Xt;
            var r = e.stateNode;
            if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
                return r.__reactInternalMemoizedMaskedChildContext;
            var o = {}, i;
            for (i in n)
                o[i] = t[i];
            return r && (e = e.stateNode,
                e.__reactInternalMemoizedUnmaskedChildContext = t,
                e.__reactInternalMemoizedMaskedChildContext = o),
                o
        }
        function Te(e) {
            return e = e.childContextTypes,
                e != null
        }
        function ti() {
            K(xe),
                K(ye)
        }
        function Qu(e, t, n) {
            if (ye.current !== Xt)
                throw Error(N(168));
            $(ye, t),
                $(xe, n)
        }
        function md(e, t, n) {
            var r = e.stateNode;
            if (t = t.childContextTypes,
                typeof r.getChildContext != "function")
                return n;
            r = r.getChildContext();
            for (var o in r)
                if (!(o in t))
                    throw Error(N(108, Qp(e) || "Unknown", o));
            return Z({}, n, r)
        }
        function ni(e) {
            return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Xt,
                pn = ye.current,
                $(ye, e),
                $(xe, xe.current),
                !0
        }
        function Ku(e, t, n) {
            var r = e.stateNode;
            if (!r)
                throw Error(N(169));
            n ? (e = md(e, t, pn),
                r.__reactInternalMemoizedMergedChildContext = e,
                K(xe),
                K(ye),
                $(ye, e)) : K(xe),
                $(xe, n)
        }
        var gt = null
            , Si = !1
            , Nl = !1;
        function hd(e) {
            gt === null ? gt = [e] : gt.push(e)
        }
        function lh(e) {
            Si = !0,
                hd(e)
        }
        function Jt() {
            if (!Nl && gt !== null) {
                Nl = !0;
                var e = 0
                    , t = U;
                try {
                    var n = gt;
                    for (U = 1; e < n.length; e++) {
                        var r = n[e];
                        do
                            r = r(!0);
                        while (r !== null)
                    }
                    gt = null,
                        Si = !1
                } catch (o) {
                    throw gt !== null && (gt = gt.slice(e + 1)),
                    Uc(Ls, Jt),
                    o
                } finally {
                    U = t,
                        Nl = !1
                }
            }
            return null
        }
        var Dn = []
            , On = 0
            , ri = null
            , oi = 0
            , We = []
            , Ue = 0
            , mn = null
            , wt = 1
            , kt = "";
        function ln(e, t) {
            Dn[On++] = oi,
                Dn[On++] = ri,
                ri = e,
                oi = t
        }
        function vd(e, t, n) {
            We[Ue++] = wt,
                We[Ue++] = kt,
                We[Ue++] = mn,
                mn = e;
            var r = wt;
            e = kt;
            var o = 32 - Je(r) - 1;
            r &= ~(1 << o),
                n += 1;
            var i = 32 - Je(t) + o;
            if (30 < i) {
                var l = o - o % 5;
                i = (r & (1 << l) - 1).toString(32),
                    r >>= l,
                    o -= l,
                    wt = 1 << 32 - Je(t) + o | n << o | r,
                    kt = i + e
            } else
                wt = 1 << i | n << o | r,
                    kt = e
        }
        function Ws(e) {
            e.return !== null && (ln(e, 1),
                vd(e, 1, 0))
        }
        function Us(e) {
            for (; e === ri;)
                ri = Dn[--On],
                    Dn[On] = null,
                    oi = Dn[--On],
                    Dn[On] = null;
            for (; e === mn;)
                mn = We[--Ue],
                    We[Ue] = null,
                    kt = We[--Ue],
                    We[Ue] = null,
                    wt = We[--Ue],
                    We[Ue] = null
        }
        var Ie = null
            , Re = null
            , G = !1
            , Ze = null;
        function yd(e, t) {
            var n = je(5, null, null, 0);
            n.elementType = "DELETED",
                n.stateNode = t,
                n.return = e,
                t = e.deletions,
                t === null ? (e.deletions = [n],
                    e.flags |= 16) : t.push(n)
        }
        function Gu(e, t) {
            switch (e.tag) {
                case 5:
                    var n = e.type;
                    return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t,
                        t !== null ? (e.stateNode = t,
                            Ie = e,
                            Re = Ht(t.firstChild),
                            !0) : !1;
                case 6:
                    return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t,
                        t !== null ? (e.stateNode = t,
                            Ie = e,
                            Re = null,
                            !0) : !1;
                case 13:
                    return t = t.nodeType !== 8 ? null : t,
                        t !== null ? (n = mn !== null ? {
                            id: wt,
                            overflow: kt
                        } : null,
                            e.memoizedState = {
                                dehydrated: t,
                                treeContext: n,
                                retryLane: 1073741824
                            },
                            n = je(18, null, null, 0),
                            n.stateNode = t,
                            n.return = e,
                            e.child = n,
                            Ie = e,
                            Re = null,
                            !0) : !1;
                default:
                    return !1
            }
        }
        function os(e) {
            return (e.mode & 1) !== 0 && (e.flags & 128) === 0
        }
        function is(e) {
            if (G) {
                var t = Re;
                if (t) {
                    var n = t;
                    if (!Gu(e, t)) {
                        if (os(e))
                            throw Error(N(418));
                        t = Ht(n.nextSibling);
                        var r = Ie;
                        t && Gu(e, t) ? yd(r, n) : (e.flags = e.flags & -4097 | 2,
                            G = !1,
                            Ie = e)
                    }
                } else {
                    if (os(e))
                        throw Error(N(418));
                    e.flags = e.flags & -4097 | 2,
                        G = !1,
                        Ie = e
                }
            }
        }
        function Yu(e) {
            for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13;)
                e = e.return;
            Ie = e
        }
        function zo(e) {
            if (e !== Ie)
                return !1;
            if (!G)
                return Yu(e),
                    G = !0,
                    !1;
            var t;
            if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type,
                t = t !== "head" && t !== "body" && !es(e.type, e.memoizedProps)),
                t && (t = Re)) {
                if (os(e))
                    throw gd(),
                    Error(N(418));
                for (; t;)
                    yd(e, t),
                        t = Ht(t.nextSibling)
            }
            if (Yu(e),
                e.tag === 13) {
                if (e = e.memoizedState,
                    e = e !== null ? e.dehydrated : null,
                    !e)
                    throw Error(N(317));
                e: {
                    for (e = e.nextSibling,
                        t = 0; e;) {
                        if (e.nodeType === 8) {
                            var n = e.data;
                            if (n === "/$") {
                                if (t === 0) {
                                    Re = Ht(e.nextSibling);
                                    break e
                                }
                                t--
                            } else
                                n !== "$" && n !== "$!" && n !== "$?" || t++
                        }
                        e = e.nextSibling
                    }
                    Re = null
                }
            } else
                Re = Ie ? Ht(e.stateNode.nextSibling) : null;
            return !0
        }
        function gd() {
            for (var e = Re; e;)
                e = Ht(e.nextSibling)
        }
        function Yn() {
            Re = Ie = null,
                G = !1
        }
        function js(e) {
            Ze === null ? Ze = [e] : Ze.push(e)
        }
        var sh = Pt.ReactCurrentBatchConfig;
        function mr(e, t, n) {
            if (e = n.ref,
                e !== null && typeof e != "function" && typeof e != "object") {
                if (n._owner) {
                    if (n = n._owner,
                        n) {
                        if (n.tag !== 1)
                            throw Error(N(309));
                        var r = n.stateNode
                    }
                    if (!r)
                        throw Error(N(147, e));
                    var o = r
                        , i = "" + e;
                    return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === i ? t.ref : (t = function (l) {
                        var s = o.refs;
                        l === null ? delete s[i] : s[i] = l
                    }
                        ,
                        t._stringRef = i,
                        t)
                }
                if (typeof e != "string")
                    throw Error(N(284));
                if (!n._owner)
                    throw Error(N(290, e))
            }
            return e
        }
        function Ro(e, t) {
            throw e = Object.prototype.toString.call(t),
            Error(N(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e))
        }
        function Xu(e) {
            var t = e._init;
            return t(e._payload)
        }
        function wd(e) {
            function t(f, c) {
                if (e) {
                    var p = f.deletions;
                    p === null ? (f.deletions = [c],
                        f.flags |= 16) : p.push(c)
                }
            }
            function n(f, c) {
                if (!e)
                    return null;
                for (; c !== null;)
                    t(f, c),
                        c = c.sibling;
                return null
            }
            function r(f, c) {
                for (f = new Map; c !== null;)
                    c.key !== null ? f.set(c.key, c) : f.set(c.index, c),
                        c = c.sibling;
                return f
            }
            function o(f, c) {
                return f = Gt(f, c),
                    f.index = 0,
                    f.sibling = null,
                    f
            }
            function i(f, c, p) {
                return f.index = p,
                    e ? (p = f.alternate,
                        p !== null ? (p = p.index,
                            p < c ? (f.flags |= 2,
                                c) : p) : (f.flags |= 2,
                                    c)) : (f.flags |= 1048576,
                                        c)
            }
            function l(f) {
                return e && f.alternate === null && (f.flags |= 2),
                    f
            }
            function s(f, c, p, g) {
                return c === null || c.tag !== 6 ? (c = Ml(p, f.mode, g),
                    c.return = f,
                    c) : (c = o(c, p),
                        c.return = f,
                        c)
            }
            function a(f, c, p, g) {
                var P = p.type;
                return P === Mn ? d(f, c, p.props.children, g, p.key) : c !== null && (c.elementType === P || typeof P == "object" && P !== null && P.$$typeof === Ft && Xu(P) === c.type) ? (g = o(c, p.props),
                    g.ref = mr(f, c, p),
                    g.return = f,
                    g) : (g = Qo(p.type, p.key, p.props, null, f.mode, g),
                        g.ref = mr(f, c, p),
                        g.return = f,
                        g)
            }
            function u(f, c, p, g) {
                return c === null || c.tag !== 4 || c.stateNode.containerInfo !== p.containerInfo || c.stateNode.implementation !== p.implementation ? (c = Ll(p, f.mode, g),
                    c.return = f,
                    c) : (c = o(c, p.children || []),
                        c.return = f,
                        c)
            }
            function d(f, c, p, g, P) {
                return c === null || c.tag !== 7 ? (c = fn(p, f.mode, g, P),
                    c.return = f,
                    c) : (c = o(c, p),
                        c.return = f,
                        c)
            }
            function h(f, c, p) {
                if (typeof c == "string" && c !== "" || typeof c == "number")
                    return c = Ml("" + c, f.mode, p),
                        c.return = f,
                        c;
                if (typeof c == "object" && c !== null) {
                    switch (c.$$typeof) {
                        case yo:
                            return p = Qo(c.type, c.key, c.props, null, f.mode, p),
                                p.ref = mr(f, null, c),
                                p.return = f,
                                p;
                        case Tn:
                            return c = Ll(c, f.mode, p),
                                c.return = f,
                                c;
                        case Ft:
                            var g = c._init;
                            return h(f, g(c._payload), p)
                    }
                    if (wr(c) || cr(c))
                        return c = fn(c, f.mode, p, null),
                            c.return = f,
                            c;
                    Ro(f, c)
                }
                return null
            }
            function m(f, c, p, g) {
                var P = c !== null ? c.key : null;
                if (typeof p == "string" && p !== "" || typeof p == "number")
                    return P !== null ? null : s(f, c, "" + p, g);
                if (typeof p == "object" && p !== null) {
                    switch (p.$$typeof) {
                        case yo:
                            return p.key === P ? a(f, c, p, g) : null;
                        case Tn:
                            return p.key === P ? u(f, c, p, g) : null;
                        case Ft:
                            return P = p._init,
                                m(f, c, P(p._payload), g)
                    }
                    if (wr(p) || cr(p))
                        return P !== null ? null : d(f, c, p, g, null);
                    Ro(f, p)
                }
                return null
            }
            function v(f, c, p, g, P) {
                if (typeof g == "string" && g !== "" || typeof g == "number")
                    return f = f.get(p) || null,
                        s(c, f, "" + g, P);
                if (typeof g == "object" && g !== null) {
                    switch (g.$$typeof) {
                        case yo:
                            return f = f.get(g.key === null ? p : g.key) || null,
                                a(c, f, g, P);
                        case Tn:
                            return f = f.get(g.key === null ? p : g.key) || null,
                                u(c, f, g, P);
                        case Ft:
                            var _ = g._init;
                            return v(f, c, p, _(g._payload), P)
                    }
                    if (wr(g) || cr(g))
                        return f = f.get(p) || null,
                            d(c, f, g, P, null);
                    Ro(c, g)
                }
                return null
            }
            function y(f, c, p, g) {
                for (var P = null, _ = null, w = c, C = c = 0, Y = null; w !== null && C < p.length; C++) {
                    w.index > C ? (Y = w,
                        w = null) : Y = w.sibling;
                    var O = m(f, w, p[C], g);
                    if (O === null) {
                        w === null && (w = Y);
                        break
                    }
                    e && w && O.alternate === null && t(f, w),
                        c = i(O, c, C),
                        _ === null ? P = O : _.sibling = O,
                        _ = O,
                        w = Y
                }
                if (C === p.length)
                    return n(f, w),
                        G && ln(f, C),
                        P;
                if (w === null) {
                    for (; C < p.length; C++)
                        w = h(f, p[C], g),
                            w !== null && (c = i(w, c, C),
                                _ === null ? P = w : _.sibling = w,
                                _ = w);
                    return G && ln(f, C),
                        P
                }
                for (w = r(f, w); C < p.length; C++)
                    Y = v(w, f, C, p[C], g),
                        Y !== null && (e && Y.alternate !== null && w.delete(Y.key === null ? C : Y.key),
                            c = i(Y, c, C),
                            _ === null ? P = Y : _.sibling = Y,
                            _ = Y);
                return e && w.forEach(function (Qe) {
                    return t(f, Qe)
                }),
                    G && ln(f, C),
                    P
            }
            function S(f, c, p, g) {
                var P = cr(p);
                if (typeof P != "function")
                    throw Error(N(150));
                if (p = P.call(p),
                    p == null)
                    throw Error(N(151));
                for (var _ = P = null, w = c, C = c = 0, Y = null, O = p.next(); w !== null && !O.done; C++,
                    O = p.next()) {
                    w.index > C ? (Y = w,
                        w = null) : Y = w.sibling;
                    var Qe = m(f, w, O.value, g);
                    if (Qe === null) {
                        w === null && (w = Y);
                        break
                    }
                    e && w && Qe.alternate === null && t(f, w),
                        c = i(Qe, c, C),
                        _ === null ? P = Qe : _.sibling = Qe,
                        _ = Qe,
                        w = Y
                }
                if (O.done)
                    return n(f, w),
                        G && ln(f, C),
                        P;
                if (w === null) {
                    for (; !O.done; C++,
                        O = p.next())
                        O = h(f, O.value, g),
                            O !== null && (c = i(O, c, C),
                                _ === null ? P = O : _.sibling = O,
                                _ = O);
                    return G && ln(f, C),
                        P
                }
                for (w = r(f, w); !O.done; C++,
                    O = p.next())
                    O = v(w, f, C, O.value, g),
                        O !== null && (e && O.alternate !== null && w.delete(O.key === null ? C : O.key),
                            c = i(O, c, C),
                            _ === null ? P = O : _.sibling = O,
                            _ = O);
                return e && w.forEach(function (En) {
                    return t(f, En)
                }),
                    G && ln(f, C),
                    P
            }
            function L(f, c, p, g) {
                if (typeof p == "object" && p !== null && p.type === Mn && p.key === null && (p = p.props.children),
                    typeof p == "object" && p !== null) {
                    switch (p.$$typeof) {
                        case yo:
                            e: {
                                for (var P = p.key, _ = c; _ !== null;) {
                                    if (_.key === P) {
                                        if (P = p.type,
                                            P === Mn) {
                                            if (_.tag === 7) {
                                                n(f, _.sibling),
                                                    c = o(_, p.props.children),
                                                    c.return = f,
                                                    f = c;
                                                break e
                                            }
                                        } else if (_.elementType === P || typeof P == "object" && P !== null && P.$$typeof === Ft && Xu(P) === _.type) {
                                            n(f, _.sibling),
                                                c = o(_, p.props),
                                                c.ref = mr(f, _, p),
                                                c.return = f,
                                                f = c;
                                            break e
                                        }
                                        n(f, _);
                                        break
                                    } else
                                        t(f, _);
                                    _ = _.sibling
                                }
                                p.type === Mn ? (c = fn(p.props.children, f.mode, g, p.key),
                                    c.return = f,
                                    f = c) : (g = Qo(p.type, p.key, p.props, null, f.mode, g),
                                        g.ref = mr(f, c, p),
                                        g.return = f,
                                        f = g)
                            }
                            return l(f);
                        case Tn:
                            e: {
                                for (_ = p.key; c !== null;) {
                                    if (c.key === _)
                                        if (c.tag === 4 && c.stateNode.containerInfo === p.containerInfo && c.stateNode.implementation === p.implementation) {
                                            n(f, c.sibling),
                                                c = o(c, p.children || []),
                                                c.return = f,
                                                f = c;
                                            break e
                                        } else {
                                            n(f, c);
                                            break
                                        }
                                    else
                                        t(f, c);
                                    c = c.sibling
                                }
                                c = Ll(p, f.mode, g),
                                    c.return = f,
                                    f = c
                            }
                            return l(f);
                        case Ft:
                            return _ = p._init,
                                L(f, c, _(p._payload), g)
                    }
                    if (wr(p))
                        return y(f, c, p, g);
                    if (cr(p))
                        return S(f, c, p, g);
                    Ro(f, p)
                }
                return typeof p == "string" && p !== "" || typeof p == "number" ? (p = "" + p,
                    c !== null && c.tag === 6 ? (n(f, c.sibling),
                        c = o(c, p),
                        c.return = f,
                        f = c) : (n(f, c),
                            c = Ml(p, f.mode, g),
                            c.return = f,
                            f = c),
                    l(f)) : n(f, c)
            }
            return L
        }
        var Xn = wd(!0)
            , kd = wd(!1)
            , ii = Zt(null)
            , li = null
            , An = null
            , Vs = null;
        function Hs() {
            Vs = An = li = null
        }
        function $s(e) {
            var t = ii.current;
            K(ii),
                e._currentValue = t
        }
        function ls(e, t, n) {
            for (; e !== null;) {
                var r = e.alternate;
                if ((e.childLanes & t) !== t ? (e.childLanes |= t,
                    r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
                    e === n)
                    break;
                e = e.return
            }
        }
        function $n(e, t) {
            li = e,
                Vs = An = null,
                e = e.dependencies,
                e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (Pe = !0),
                    e.firstContext = null)
        }
        function He(e) {
            var t = e._currentValue;
            if (Vs !== e)
                if (e = {
                    context: e,
                    memoizedValue: t,
                    next: null
                },
                    An === null) {
                    if (li === null)
                        throw Error(N(308));
                    An = e,
                        li.dependencies = {
                            lanes: 0,
                            firstContext: e
                        }
                } else
                    An = An.next = e;
            return t
        }
        var un = null;
        function Qs(e) {
            un === null ? un = [e] : un.push(e)
        }
        function Sd(e, t, n, r) {
            var o = t.interleaved;
            return o === null ? (n.next = n,
                Qs(t)) : (n.next = o.next,
                    o.next = n),
                t.interleaved = n,
                Ct(e, r)
        }
        function Ct(e, t) {
            e.lanes |= t;
            var n = e.alternate;
            for (n !== null && (n.lanes |= t),
                n = e,
                e = e.return; e !== null;)
                e.childLanes |= t,
                    n = e.alternate,
                    n !== null && (n.childLanes |= t),
                    n = e,
                    e = e.return;
            return n.tag === 3 ? n.stateNode : null
        }
        var Dt = !1;
        function Ks(e) {
            e.updateQueue = {
                baseState: e.memoizedState,
                firstBaseUpdate: null,
                lastBaseUpdate: null,
                shared: {
                    pending: null,
                    interleaved: null,
                    lanes: 0
                },
                effects: null
            }
        }
        function Nd(e, t) {
            e = e.updateQueue,
                t.updateQueue === e && (t.updateQueue = {
                    baseState: e.baseState,
                    firstBaseUpdate: e.firstBaseUpdate,
                    lastBaseUpdate: e.lastBaseUpdate,
                    shared: e.shared,
                    effects: e.effects
                })
        }
        function St(e, t) {
            return {
                eventTime: e,
                lane: t,
                tag: 0,
                payload: null,
                callback: null,
                next: null
            }
        }
        function $t(e, t, n) {
            var r = e.updateQueue;
            if (r === null)
                return null;
            if (r = r.shared,
                (W & 2) !== 0) {
                var o = r.pending;
                return o === null ? t.next = t : (t.next = o.next,
                    o.next = t),
                    r.pending = t,
                    Ct(e, n)
            }
            return o = r.interleaved,
                o === null ? (t.next = t,
                    Qs(r)) : (t.next = o.next,
                        o.next = t),
                r.interleaved = t,
                Ct(e, n)
        }
        function Wo(e, t, n) {
            if (t = t.updateQueue,
                t !== null && (t = t.shared,
                    (n & 4194240) !== 0)) {
                var r = t.lanes;
                r &= e.pendingLanes,
                    n |= r,
                    t.lanes = n,
                    zs(e, n)
            }
        }
        function qu(e, t) {
            var n = e.updateQueue
                , r = e.alternate;
            if (r !== null && (r = r.updateQueue,
                n === r)) {
                var o = null
                    , i = null;
                if (n = n.firstBaseUpdate,
                    n !== null) {
                    do {
                        var l = {
                            eventTime: n.eventTime,
                            lane: n.lane,
                            tag: n.tag,
                            payload: n.payload,
                            callback: n.callback,
                            next: null
                        };
                        i === null ? o = i = l : i = i.next = l,
                            n = n.next
                    } while (n !== null);
                    i === null ? o = i = t : i = i.next = t
                } else
                    o = i = t;
                n = {
                    baseState: r.baseState,
                    firstBaseUpdate: o,
                    lastBaseUpdate: i,
                    shared: r.shared,
                    effects: r.effects
                },
                    e.updateQueue = n;
                return
            }
            e = n.lastBaseUpdate,
                e === null ? n.firstBaseUpdate = t : e.next = t,
                n.lastBaseUpdate = t
        }
        function si(e, t, n, r) {
            var o = e.updateQueue;
            Dt = !1;
            var i = o.firstBaseUpdate
                , l = o.lastBaseUpdate
                , s = o.shared.pending;
            if (s !== null) {
                o.shared.pending = null;
                var a = s
                    , u = a.next;
                a.next = null,
                    l === null ? i = u : l.next = u,
                    l = a;
                var d = e.alternate;
                d !== null && (d = d.updateQueue,
                    s = d.lastBaseUpdate,
                    s !== l && (s === null ? d.firstBaseUpdate = u : s.next = u,
                        d.lastBaseUpdate = a))
            }
            if (i !== null) {
                var h = o.baseState;
                l = 0,
                    d = u = a = null,
                    s = i;
                do {
                    var m = s.lane
                        , v = s.eventTime;
                    if ((r & m) === m) {
                        d !== null && (d = d.next = {
                            eventTime: v,
                            lane: 0,
                            tag: s.tag,
                            payload: s.payload,
                            callback: s.callback,
                            next: null
                        });
                        e: {
                            var y = e
                                , S = s;
                            switch (m = t,
                            v = n,
                            S.tag) {
                                case 1:
                                    if (y = S.payload,
                                        typeof y == "function") {
                                        h = y.call(v, h, m);
                                        break e
                                    }
                                    h = y;
                                    break e;
                                case 3:
                                    y.flags = y.flags & -65537 | 128;
                                case 0:
                                    if (y = S.payload,
                                        m = typeof y == "function" ? y.call(v, h, m) : y,
                                        m == null)
                                        break e;
                                    h = Z({}, h, m);
                                    break e;
                                case 2:
                                    Dt = !0
                            }
                        }
                        s.callback !== null && s.lane !== 0 && (e.flags |= 64,
                            m = o.effects,
                            m === null ? o.effects = [s] : m.push(s))
                    } else
                        v = {
                            eventTime: v,
                            lane: m,
                            tag: s.tag,
                            payload: s.payload,
                            callback: s.callback,
                            next: null
                        },
                            d === null ? (u = d = v,
                                a = h) : d = d.next = v,
                            l |= m;
                    if (s = s.next,
                        s === null) {
                        if (s = o.shared.pending,
                            s === null)
                            break;
                        m = s,
                            s = m.next,
                            m.next = null,
                            o.lastBaseUpdate = m,
                            o.shared.pending = null
                    }
                } while (!0);
                if (d === null && (a = h),
                    o.baseState = a,
                    o.firstBaseUpdate = u,
                    o.lastBaseUpdate = d,
                    t = o.shared.interleaved,
                    t !== null) {
                    o = t;
                    do
                        l |= o.lane,
                            o = o.next;
                    while (o !== t)
                } else
                    i === null && (o.shared.lanes = 0);
                vn |= l,
                    e.lanes = l,
                    e.memoizedState = h
            }
        }
        function Zu(e, t, n) {
            if (e = t.effects,
                t.effects = null,
                e !== null)
                for (t = 0; t < e.length; t++) {
                    var r = e[t]
                        , o = r.callback;
                    if (o !== null) {
                        if (r.callback = null,
                            r = n,
                            typeof o != "function")
                            throw Error(N(191, o));
                        o.call(r)
                    }
                }
        }
        var Zr = {}
            , ut = Zt(Zr)
            , Vr = Zt(Zr)
            , Hr = Zt(Zr);
        function cn(e) {
            if (e === Zr)
                throw Error(N(174));
            return e
        }
        function Gs(e, t) {
            switch ($(Hr, t),
            $(Vr, e),
            $(ut, Zr),
            e = t.nodeType,
            e) {
                case 9:
                case 11:
                    t = (t = t.documentElement) ? t.namespaceURI : Ul(null, "");
                    break;
                default:
                    e = e === 8 ? t.parentNode : t,
                        t = e.namespaceURI || null,
                        e = e.tagName,
                        t = Ul(t, e)
            }
            K(ut),
                $(ut, t)
        }
        function qn() {
            K(ut),
                K(Vr),
                K(Hr)
        }
        function Ed(e) {
            cn(Hr.current);
            var t = cn(ut.current)
                , n = Ul(t, e.type);
            t !== n && ($(Vr, e),
                $(ut, n))
        }
        function Ys(e) {
            Vr.current === e && (K(ut),
                K(Vr))
        }
        var X = Zt(0);
        function ai(e) {
            for (var t = e; t !== null;) {
                if (t.tag === 13) {
                    var n = t.memoizedState;
                    if (n !== null && (n = n.dehydrated,
                        n === null || n.data === "$?" || n.data === "$!"))
                        return t
                } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
                    if ((t.flags & 128) !== 0)
                        return t
                } else if (t.child !== null) {
                    t.child.return = t,
                        t = t.child;
                    continue
                }
                if (t === e)
                    break;
                for (; t.sibling === null;) {
                    if (t.return === null || t.return === e)
                        return null;
                    t = t.return
                }
                t.sibling.return = t.return,
                    t = t.sibling
            }
            return null
        }
        var El = [];
        function Xs() {
            for (var e = 0; e < El.length; e++)
                El[e]._workInProgressVersionPrimary = null;
            El.length = 0
        }
        var Uo = Pt.ReactCurrentDispatcher
            , Cl = Pt.ReactCurrentBatchConfig
            , hn = 0
            , q = null
            , oe = null
            , se = null
            , ui = !1
            , xr = !1
            , $r = 0
            , ah = 0;
        function me() {
            throw Error(N(321))
        }
        function qs(e, t) {
            if (t === null)
                return !1;
            for (var n = 0; n < t.length && n < e.length; n++)
                if (!et(e[n], t[n]))
                    return !1;
            return !0
        }
        function Zs(e, t, n, r, o, i) {
            if (hn = i,
                q = t,
                t.memoizedState = null,
                t.updateQueue = null,
                t.lanes = 0,
                Uo.current = e === null || e.memoizedState === null ? fh : ph,
                e = n(r, o),
                xr) {
                i = 0;
                do {
                    if (xr = !1,
                        $r = 0,
                        25 <= i)
                        throw Error(N(301));
                    i += 1,
                        se = oe = null,
                        t.updateQueue = null,
                        Uo.current = mh,
                        e = n(r, o)
                } while (xr)
            }
            if (Uo.current = ci,
                t = oe !== null && oe.next !== null,
                hn = 0,
                se = oe = q = null,
                ui = !1,
                t)
                throw Error(N(300));
            return e
        }
        function Js() {
            var e = $r !== 0;
            return $r = 0,
                e
        }
        function lt() {
            var e = {
                memoizedState: null,
                baseState: null,
                baseQueue: null,
                queue: null,
                next: null
            };
            return se === null ? q.memoizedState = se = e : se = se.next = e,
                se
        }
        function $e() {
            if (oe === null) {
                var e = q.alternate;
                e = e !== null ? e.memoizedState : null
            } else
                e = oe.next;
            var t = se === null ? q.memoizedState : se.next;
            if (t !== null)
                se = t,
                    oe = e;
            else {
                if (e === null)
                    throw Error(N(310));
                oe = e,
                    e = {
                        memoizedState: oe.memoizedState,
                        baseState: oe.baseState,
                        baseQueue: oe.baseQueue,
                        queue: oe.queue,
                        next: null
                    },
                    se === null ? q.memoizedState = se = e : se = se.next = e
            }
            return se
        }
        function Qr(e, t) {
            return typeof t == "function" ? t(e) : t
        }
        function _l(e) {
            var t = $e()
                , n = t.queue;
            if (n === null)
                throw Error(N(311));
            n.lastRenderedReducer = e;
            var r = oe
                , o = r.baseQueue
                , i = n.pending;
            if (i !== null) {
                if (o !== null) {
                    var l = o.next;
                    o.next = i.next,
                        i.next = l
                }
                r.baseQueue = o = i,
                    n.pending = null
            }
            if (o !== null) {
                i = o.next,
                    r = r.baseState;
                var s = l = null
                    , a = null
                    , u = i;
                do {
                    var d = u.lane;
                    if ((hn & d) === d)
                        a !== null && (a = a.next = {
                            lane: 0,
                            action: u.action,
                            hasEagerState: u.hasEagerState,
                            eagerState: u.eagerState,
                            next: null
                        }),
                            r = u.hasEagerState ? u.eagerState : e(r, u.action);
                    else {
                        var h = {
                            lane: d,
                            action: u.action,
                            hasEagerState: u.hasEagerState,
                            eagerState: u.eagerState,
                            next: null
                        };
                        a === null ? (s = a = h,
                            l = r) : a = a.next = h,
                            q.lanes |= d,
                            vn |= d
                    }
                    u = u.next
                } while (u !== null && u !== i);
                a === null ? l = r : a.next = s,
                    et(r, t.memoizedState) || (Pe = !0),
                    t.memoizedState = r,
                    t.baseState = l,
                    t.baseQueue = a,
                    n.lastRenderedState = r
            }
            if (e = n.interleaved,
                e !== null) {
                o = e;
                do
                    i = o.lane,
                        q.lanes |= i,
                        vn |= i,
                        o = o.next;
                while (o !== e)
            } else
                o === null && (n.lanes = 0);
            return [t.memoizedState, n.dispatch]
        }
        function Pl(e) {
            var t = $e()
                , n = t.queue;
            if (n === null)
                throw Error(N(311));
            n.lastRenderedReducer = e;
            var r = n.dispatch
                , o = n.pending
                , i = t.memoizedState;
            if (o !== null) {
                n.pending = null;
                var l = o = o.next;
                do
                    i = e(i, l.action),
                        l = l.next;
                while (l !== o);
                et(i, t.memoizedState) || (Pe = !0),
                    t.memoizedState = i,
                    t.baseQueue === null && (t.baseState = i),
                    n.lastRenderedState = i
            }
            return [i, r]
        }
        function Cd() { }
        function _d(e, t) {
            var n = q
                , r = $e()
                , o = t()
                , i = !et(r.memoizedState, o);
            if (i && (r.memoizedState = o,
                Pe = !0),
                r = r.queue,
                bs(Td.bind(null, n, r, e), [e]),
                r.getSnapshot !== t || i || se !== null && se.memoizedState.tag & 1) {
                if (n.flags |= 2048,
                    Kr(9, xd.bind(null, n, r, o, t), void 0, null),
                    ae === null)
                    throw Error(N(349));
                (hn & 30) !== 0 || Pd(n, t, o)
            }
            return o
        }
        function Pd(e, t, n) {
            e.flags |= 16384,
                e = {
                    getSnapshot: t,
                    value: n
                },
                t = q.updateQueue,
                t === null ? (t = {
                    lastEffect: null,
                    stores: null
                },
                    q.updateQueue = t,
                    t.stores = [e]) : (n = t.stores,
                        n === null ? t.stores = [e] : n.push(e))
        }
        function xd(e, t, n, r) {
            t.value = n,
                t.getSnapshot = r,
                Md(t) && Ld(e)
        }
        function Td(e, t, n) {
            return n(function () {
                Md(t) && Ld(e)
            })
        }
        function Md(e) {
            var t = e.getSnapshot;
            e = e.value;
            try {
                var n = t();
                return !et(e, n)
            } catch {
                return !0
            }
        }
        function Ld(e) {
            var t = Ct(e, 1);
            t !== null && be(t, e, 1, -1)
        }
        function Ju(e) {
            var t = lt();
            return typeof e == "function" && (e = e()),
                t.memoizedState = t.baseState = e,
                e = {
                    pending: null,
                    interleaved: null,
                    lanes: 0,
                    dispatch: null,
                    lastRenderedReducer: Qr,
                    lastRenderedState: e
                },
                t.queue = e,
                e = e.dispatch = dh.bind(null, q, e),
                [t.memoizedState, e]
        }
        function Kr(e, t, n, r) {
            return e = {
                tag: e,
                create: t,
                destroy: n,
                deps: r,
                next: null
            },
                t = q.updateQueue,
                t === null ? (t = {
                    lastEffect: null,
                    stores: null
                },
                    q.updateQueue = t,
                    t.lastEffect = e.next = e) : (n = t.lastEffect,
                        n === null ? t.lastEffect = e.next = e : (r = n.next,
                            n.next = e,
                            e.next = r,
                            t.lastEffect = e)),
                e
        }
        function zd() {
            return $e().memoizedState
        }
        function jo(e, t, n, r) {
            var o = lt();
            q.flags |= e,
                o.memoizedState = Kr(1 | t, n, void 0, r === void 0 ? null : r)
        }
        function Ni(e, t, n, r) {
            var o = $e();
            r = r === void 0 ? null : r;
            var i = void 0;
            if (oe !== null) {
                var l = oe.memoizedState;
                if (i = l.destroy,
                    r !== null && qs(r, l.deps)) {
                    o.memoizedState = Kr(t, n, i, r);
                    return
                }
            }
            q.flags |= e,
                o.memoizedState = Kr(1 | t, n, i, r)
        }
        function bu(e, t) {
            return jo(8390656, 8, e, t)
        }
        function bs(e, t) {
            return Ni(2048, 8, e, t)
        }
        function Rd(e, t) {
            return Ni(4, 2, e, t)
        }
        function Id(e, t) {
            return Ni(4, 4, e, t)
        }
        function Fd(e, t) {
            if (typeof t == "function")
                return e = e(),
                    t(e),
                    function () {
                        t(null)
                    }
                    ;
            if (t != null)
                return e = e(),
                    t.current = e,
                    function () {
                        t.current = null
                    }
        }
        function Dd(e, t, n) {
            return n = n != null ? n.concat([e]) : null,
                Ni(4, 4, Fd.bind(null, t, e), n)
        }
        function ea() { }
        function Od(e, t) {
            var n = $e();
            t = t === void 0 ? null : t;
            var r = n.memoizedState;
            return r !== null && t !== null && qs(t, r[1]) ? r[0] : (n.memoizedState = [e, t],
                e)
        }
        function Ad(e, t) {
            var n = $e();
            t = t === void 0 ? null : t;
            var r = n.memoizedState;
            return r !== null && t !== null && qs(t, r[1]) ? r[0] : (e = e(),
                n.memoizedState = [e, t],
                e)
        }
        function Bd(e, t, n) {
            return (hn & 21) === 0 ? (e.baseState && (e.baseState = !1,
                Pe = !0),
                e.memoizedState = n) : (et(n, t) || (n = Hc(),
                    q.lanes |= n,
                    vn |= n,
                    e.baseState = !0),
                    t)
        }
        function uh(e, t) {
            var n = U;
            U = n !== 0 && 4 > n ? n : 4,
                e(!0);
            var r = Cl.transition;
            Cl.transition = {};
            try {
                e(!1),
                    t()
            } finally {
                U = n,
                    Cl.transition = r
            }
        }
        function Wd() {
            return $e().memoizedState
        }
        function ch(e, t, n) {
            var r = Kt(e);
            if (n = {
                lane: r,
                action: n,
                hasEagerState: !1,
                eagerState: null,
                next: null
            },
                Ud(e))
                jd(t, n);
            else if (n = Sd(e, t, n, r),
                n !== null) {
                var o = Ne();
                be(n, e, r, o),
                    Vd(n, t, r)
            }
        }
        function dh(e, t, n) {
            var r = Kt(e)
                , o = {
                    lane: r,
                    action: n,
                    hasEagerState: !1,
                    eagerState: null,
                    next: null
                };
            if (Ud(e))
                jd(t, o);
            else {
                var i = e.alternate;
                if (e.lanes === 0 && (i === null || i.lanes === 0) && (i = t.lastRenderedReducer,
                    i !== null))
                    try {
                        var l = t.lastRenderedState
                            , s = i(l, n);
                        if (o.hasEagerState = !0,
                            o.eagerState = s,
                            et(s, l)) {
                            var a = t.interleaved;
                            a === null ? (o.next = o,
                                Qs(t)) : (o.next = a.next,
                                    a.next = o),
                                t.interleaved = o;
                            return
                        }
                    } catch { } finally { }
                n = Sd(e, t, o, r),
                    n !== null && (o = Ne(),
                        be(n, e, r, o),
                        Vd(n, t, r))
            }
        }
        function Ud(e) {
            var t = e.alternate;
            return e === q || t !== null && t === q
        }
        function jd(e, t) {
            xr = ui = !0;
            var n = e.pending;
            n === null ? t.next = t : (t.next = n.next,
                n.next = t),
                e.pending = t
        }
        function Vd(e, t, n) {
            if ((n & 4194240) !== 0) {
                var r = t.lanes;
                r &= e.pendingLanes,
                    n |= r,
                    t.lanes = n,
                    zs(e, n)
            }
        }
        var ci = {
            readContext: He,
            useCallback: me,
            useContext: me,
            useEffect: me,
            useImperativeHandle: me,
            useInsertionEffect: me,
            useLayoutEffect: me,
            useMemo: me,
            useReducer: me,
            useRef: me,
            useState: me,
            useDebugValue: me,
            useDeferredValue: me,
            useTransition: me,
            useMutableSource: me,
            useSyncExternalStore: me,
            useId: me,
            unstable_isNewReconciler: !1
        }
            , fh = {
                readContext: He,
                useCallback: function (e, t) {
                    return lt().memoizedState = [e, t === void 0 ? null : t],
                        e
                },
                useContext: He,
                useEffect: bu,
                useImperativeHandle: function (e, t, n) {
                    return n = n != null ? n.concat([e]) : null,
                        jo(4194308, 4, Fd.bind(null, t, e), n)
                },
                useLayoutEffect: function (e, t) {
                    return jo(4194308, 4, e, t)
                },
                useInsertionEffect: function (e, t) {
                    return jo(4, 2, e, t)
                },
                useMemo: function (e, t) {
                    var n = lt();
                    return t = t === void 0 ? null : t,
                        e = e(),
                        n.memoizedState = [e, t],
                        e
                },
                useReducer: function (e, t, n) {
                    var r = lt();
                    return t = n !== void 0 ? n(t) : t,
                        r.memoizedState = r.baseState = t,
                        e = {
                            pending: null,
                            interleaved: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: e,
                            lastRenderedState: t
                        },
                        r.queue = e,
                        e = e.dispatch = ch.bind(null, q, e),
                        [r.memoizedState, e]
                },
                useRef: function (e) {
                    var t = lt();
                    return e = {
                        current: e
                    },
                        t.memoizedState = e
                },
                useState: Ju,
                useDebugValue: ea,
                useDeferredValue: function (e) {
                    return lt().memoizedState = e
                },
                useTransition: function () {
                    var e = Ju(!1)
                        , t = e[0];
                    return e = uh.bind(null, e[1]),
                        lt().memoizedState = e,
                        [t, e]
                },
                useMutableSource: function () { },
                useSyncExternalStore: function (e, t, n) {
                    var r = q
                        , o = lt();
                    if (G) {
                        if (n === void 0)
                            throw Error(N(407));
                        n = n()
                    } else {
                        if (n = t(),
                            ae === null)
                            throw Error(N(349));
                        (hn & 30) !== 0 || Pd(r, t, n)
                    }
                    o.memoizedState = n;
                    var i = {
                        value: n,
                        getSnapshot: t
                    };
                    return o.queue = i,
                        bu(Td.bind(null, r, i, e), [e]),
                        r.flags |= 2048,
                        Kr(9, xd.bind(null, r, i, n, t), void 0, null),
                        n
                },
                useId: function () {
                    var e = lt()
                        , t = ae.identifierPrefix;
                    if (G) {
                        var n = kt
                            , r = wt;
                        n = (r & ~(1 << 32 - Je(r) - 1)).toString(32) + n,
                            t = ":" + t + "R" + n,
                            n = $r++,
                            0 < n && (t += "H" + n.toString(32)),
                            t += ":"
                    } else
                        n = ah++,
                            t = ":" + t + "r" + n.toString(32) + ":";
                    return e.memoizedState = t
                },
                unstable_isNewReconciler: !1
            }
            , ph = {
                readContext: He,
                useCallback: Od,
                useContext: He,
                useEffect: bs,
                useImperativeHandle: Dd,
                useInsertionEffect: Rd,
                useLayoutEffect: Id,
                useMemo: Ad,
                useReducer: _l,
                useRef: zd,
                useState: function () {
                    return _l(Qr)
                },
                useDebugValue: ea,
                useDeferredValue: function (e) {
                    var t = $e();
                    return Bd(t, oe.memoizedState, e)
                },
                useTransition: function () {
                    var e = _l(Qr)[0]
                        , t = $e().memoizedState;
                    return [e, t]
                },
                useMutableSource: Cd,
                useSyncExternalStore: _d,
                useId: Wd,
                unstable_isNewReconciler: !1
            }
            , mh = {
                readContext: He,
                useCallback: Od,
                useContext: He,
                useEffect: bs,
                useImperativeHandle: Dd,
                useInsertionEffect: Rd,
                useLayoutEffect: Id,
                useMemo: Ad,
                useReducer: Pl,
                useRef: zd,
                useState: function () {
                    return Pl(Qr)
                },
                useDebugValue: ea,
                useDeferredValue: function (e) {
                    var t = $e();
                    return oe === null ? t.memoizedState = e : Bd(t, oe.memoizedState, e)
                },
                useTransition: function () {
                    var e = Pl(Qr)[0]
                        , t = $e().memoizedState;
                    return [e, t]
                },
                useMutableSource: Cd,
                useSyncExternalStore: _d,
                useId: Wd,
                unstable_isNewReconciler: !1
            };
        function Xe(e, t) {
            if (e && e.defaultProps) {
                t = Z({}, t),
                    e = e.defaultProps;
                for (var n in e)
                    t[n] === void 0 && (t[n] = e[n]);
                return t
            }
            return t
        }
        function ss(e, t, n, r) {
            t = e.memoizedState,
                n = n(r, t),
                n = n == null ? t : Z({}, t, n),
                e.memoizedState = n,
                e.lanes === 0 && (e.updateQueue.baseState = n)
        }
        var Ei = {
            isMounted: function (e) {
                return (e = e._reactInternals) ? wn(e) === e : !1
            },
            enqueueSetState: function (e, t, n) {
                e = e._reactInternals;
                var r = Ne()
                    , o = Kt(e)
                    , i = St(r, o);
                i.payload = t,
                    n != null && (i.callback = n),
                    t = $t(e, i, o),
                    t !== null && (be(t, e, o, r),
                        Wo(t, e, o))
            },
            enqueueReplaceState: function (e, t, n) {
                e = e._reactInternals;
                var r = Ne()
                    , o = Kt(e)
                    , i = St(r, o);
                i.tag = 1,
                    i.payload = t,
                    n != null && (i.callback = n),
                    t = $t(e, i, o),
                    t !== null && (be(t, e, o, r),
                        Wo(t, e, o))
            },
            enqueueForceUpdate: function (e, t) {
                e = e._reactInternals;
                var n = Ne()
                    , r = Kt(e)
                    , o = St(n, r);
                o.tag = 2,
                    t != null && (o.callback = t),
                    t = $t(e, o, r),
                    t !== null && (be(t, e, r, n),
                        Wo(t, e, r))
            }
        };
        function ec(e, t, n, r, o, i, l) {
            return e = e.stateNode,
                typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, i, l) : t.prototype && t.prototype.isPureReactComponent ? !Br(n, r) || !Br(o, i) : !0
        }
        function Hd(e, t, n) {
            var r = !1
                , o = Xt
                , i = t.contextType;
            return typeof i == "object" && i !== null ? i = He(i) : (o = Te(t) ? pn : ye.current,
                r = t.contextTypes,
                i = (r = r != null) ? Gn(e, o) : Xt),
                t = new t(n, i),
                e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null,
                t.updater = Ei,
                e.stateNode = t,
                t._reactInternals = e,
                r && (e = e.stateNode,
                    e.__reactInternalMemoizedUnmaskedChildContext = o,
                    e.__reactInternalMemoizedMaskedChildContext = i),
                t
        }
        function tc(e, t, n, r) {
            e = t.state,
                typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r),
                typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r),
                t.state !== e && Ei.enqueueReplaceState(t, t.state, null)
        }
        function as(e, t, n, r) {
            var o = e.stateNode;
            o.props = n,
                o.state = e.memoizedState,
                o.refs = {},
                Ks(e);
            var i = t.contextType;
            typeof i == "object" && i !== null ? o.context = He(i) : (i = Te(t) ? pn : ye.current,
                o.context = Gn(e, i)),
                o.state = e.memoizedState,
                i = t.getDerivedStateFromProps,
                typeof i == "function" && (ss(e, t, i, n),
                    o.state = e.memoizedState),
                typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state,
                    typeof o.componentWillMount == "function" && o.componentWillMount(),
                    typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(),
                    t !== o.state && Ei.enqueueReplaceState(o, o.state, null),
                    si(e, n, o, r),
                    o.state = e.memoizedState),
                typeof o.componentDidMount == "function" && (e.flags |= 4194308)
        }
        function Zn(e, t) {
            try {
                var n = ""
                    , r = t;
                do
                    n += $p(r),
                        r = r.return;
                while (r);
                var o = n
            } catch (i) {
                o = `
Error generating stack: ` + i.message + `
` + i.stack
            }
            return {
                value: e,
                source: t,
                stack: o,
                digest: null
            }
        }
        function xl(e, t, n) {
            return {
                value: e,
                source: null,
                stack: n ?? null,
                digest: t ?? null
            }
        }
        function us(e, t) {
            try {
                console.error(t.value)
            } catch (n) {
                setTimeout(function () {
                    throw n
                })
            }
        }
        var hh = typeof WeakMap == "function" ? WeakMap : Map;
        function $d(e, t, n) {
            n = St(-1, n),
                n.tag = 3,
                n.payload = {
                    element: null
                };
            var r = t.value;
            return n.callback = function () {
                fi || (fi = !0,
                    ws = r),
                    us(e, t)
            }
                ,
                n
        }
        function Qd(e, t, n) {
            n = St(-1, n),
                n.tag = 3;
            var r = e.type.getDerivedStateFromError;
            if (typeof r == "function") {
                var o = t.value;
                n.payload = function () {
                    return r(o)
                }
                    ,
                    n.callback = function () {
                        us(e, t)
                    }
            }
            var i = e.stateNode;
            return i !== null && typeof i.componentDidCatch == "function" && (n.callback = function () {
                us(e, t),
                    typeof r != "function" && (Qt === null ? Qt = new Set([this]) : Qt.add(this));
                var l = t.stack;
                this.componentDidCatch(t.value, {
                    componentStack: l !== null ? l : ""
                })
            }
            ),
                n
        }
        function nc(e, t, n) {
            var r = e.pingCache;
            if (r === null) {
                r = e.pingCache = new hh;
                var o = new Set;
                r.set(t, o)
            } else
                o = r.get(t),
                    o === void 0 && (o = new Set,
                        r.set(t, o));
            o.has(n) || (o.add(n),
                e = Mh.bind(null, e, t, n),
                t.then(e, e))
        }
        function rc(e) {
            do {
                var t;
                if ((t = e.tag === 13) && (t = e.memoizedState,
                    t = t !== null ? t.dehydrated !== null : !0),
                    t)
                    return e;
                e = e.return
            } while (e !== null);
            return null
        }
        function oc(e, t, n, r, o) {
            return (e.mode & 1) === 0 ? (e === t ? e.flags |= 65536 : (e.flags |= 128,
                n.flags |= 131072,
                n.flags &= -52805,
                n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = St(-1, 1),
                    t.tag = 2,
                    $t(n, t, 1))),
                n.lanes |= 1),
                e) : (e.flags |= 65536,
                    e.lanes = o,
                    e)
        }
        var vh = Pt.ReactCurrentOwner
            , Pe = !1;
        function Se(e, t, n, r) {
            t.child = e === null ? kd(t, null, n, r) : Xn(t, e.child, n, r)
        }
        function ic(e, t, n, r, o) {
            n = n.render;
            var i = t.ref;
            return $n(t, o),
                r = Zs(e, t, n, r, i, o),
                n = Js(),
                e !== null && !Pe ? (t.updateQueue = e.updateQueue,
                    t.flags &= -2053,
                    e.lanes &= ~o,
                    _t(e, t, o)) : (G && n && Ws(t),
                        t.flags |= 1,
                        Se(e, t, r, o),
                        t.child)
        }
        function lc(e, t, n, r, o) {
            if (e === null) {
                var i = n.type;
                return typeof i == "function" && !aa(i) && i.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15,
                    t.type = i,
                    Kd(e, t, i, r, o)) : (e = Qo(n.type, null, r, t, t.mode, o),
                        e.ref = t.ref,
                        e.return = t,
                        t.child = e)
            }
            if (i = e.child,
                (e.lanes & o) === 0) {
                var l = i.memoizedProps;
                if (n = n.compare,
                    n = n !== null ? n : Br,
                    n(l, r) && e.ref === t.ref)
                    return _t(e, t, o)
            }
            return t.flags |= 1,
                e = Gt(i, r),
                e.ref = t.ref,
                e.return = t,
                t.child = e
        }
        function Kd(e, t, n, r, o) {
            if (e !== null) {
                var i = e.memoizedProps;
                if (Br(i, r) && e.ref === t.ref)
                    if (Pe = !1,
                        t.pendingProps = r = i,
                        (e.lanes & o) !== 0)
                        (e.flags & 131072) !== 0 && (Pe = !0);
                    else
                        return t.lanes = e.lanes,
                            _t(e, t, o)
            }
            return cs(e, t, n, r, o)
        }
        function Gd(e, t, n) {
            var r = t.pendingProps
                , o = r.children
                , i = e !== null ? e.memoizedState : null;
            if (r.mode === "hidden")
                if ((t.mode & 1) === 0)
                    t.memoizedState = {
                        baseLanes: 0,
                        cachePool: null,
                        transitions: null
                    },
                        $(Wn, ze),
                        ze |= n;
                else {
                    if ((n & 1073741824) === 0)
                        return e = i !== null ? i.baseLanes | n : n,
                            t.lanes = t.childLanes = 1073741824,
                            t.memoizedState = {
                                baseLanes: e,
                                cachePool: null,
                                transitions: null
                            },
                            t.updateQueue = null,
                            $(Wn, ze),
                            ze |= e,
                            null;
                    t.memoizedState = {
                        baseLanes: 0,
                        cachePool: null,
                        transitions: null
                    },
                        r = i !== null ? i.baseLanes : n,
                        $(Wn, ze),
                        ze |= r
                }
            else
                i !== null ? (r = i.baseLanes | n,
                    t.memoizedState = null) : r = n,
                    $(Wn, ze),
                    ze |= r;
            return Se(e, t, o, n),
                t.child
        }
        function Yd(e, t) {
            var n = t.ref;
            (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512,
                t.flags |= 2097152)
        }
        function cs(e, t, n, r, o) {
            var i = Te(n) ? pn : ye.current;
            return i = Gn(t, i),
                $n(t, o),
                n = Zs(e, t, n, r, i, o),
                r = Js(),
                e !== null && !Pe ? (t.updateQueue = e.updateQueue,
                    t.flags &= -2053,
                    e.lanes &= ~o,
                    _t(e, t, o)) : (G && r && Ws(t),
                        t.flags |= 1,
                        Se(e, t, n, o),
                        t.child)
        }
        function sc(e, t, n, r, o) {
            if (Te(n)) {
                var i = !0;
                ni(t)
            } else
                i = !1;
            if ($n(t, o),
                t.stateNode === null)
                Vo(e, t),
                    Hd(t, n, r),
                    as(t, n, r, o),
                    r = !0;
            else if (e === null) {
                var l = t.stateNode
                    , s = t.memoizedProps;
                l.props = s;
                var a = l.context
                    , u = n.contextType;
                typeof u == "object" && u !== null ? u = He(u) : (u = Te(n) ? pn : ye.current,
                    u = Gn(t, u));
                var d = n.getDerivedStateFromProps
                    , h = typeof d == "function" || typeof l.getSnapshotBeforeUpdate == "function";
                h || typeof l.UNSAFE_componentWillReceiveProps != "function" && typeof l.componentWillReceiveProps != "function" || (s !== r || a !== u) && tc(t, l, r, u),
                    Dt = !1;
                var m = t.memoizedState;
                l.state = m,
                    si(t, r, l, o),
                    a = t.memoizedState,
                    s !== r || m !== a || xe.current || Dt ? (typeof d == "function" && (ss(t, n, d, r),
                        a = t.memoizedState),
                        (s = Dt || ec(t, n, s, r, m, a, u)) ? (h || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (typeof l.componentWillMount == "function" && l.componentWillMount(),
                            typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount()),
                            typeof l.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof l.componentDidMount == "function" && (t.flags |= 4194308),
                                t.memoizedProps = r,
                                t.memoizedState = a),
                        l.props = r,
                        l.state = a,
                        l.context = u,
                        r = s) : (typeof l.componentDidMount == "function" && (t.flags |= 4194308),
                            r = !1)
            } else {
                l = t.stateNode,
                    Nd(e, t),
                    s = t.memoizedProps,
                    u = t.type === t.elementType ? s : Xe(t.type, s),
                    l.props = u,
                    h = t.pendingProps,
                    m = l.context,
                    a = n.contextType,
                    typeof a == "object" && a !== null ? a = He(a) : (a = Te(n) ? pn : ye.current,
                        a = Gn(t, a));
                var v = n.getDerivedStateFromProps;
                (d = typeof v == "function" || typeof l.getSnapshotBeforeUpdate == "function") || typeof l.UNSAFE_componentWillReceiveProps != "function" && typeof l.componentWillReceiveProps != "function" || (s !== h || m !== a) && tc(t, l, r, a),
                    Dt = !1,
                    m = t.memoizedState,
                    l.state = m,
                    si(t, r, l, o);
                var y = t.memoizedState;
                s !== h || m !== y || xe.current || Dt ? (typeof v == "function" && (ss(t, n, v, r),
                    y = t.memoizedState),
                    (u = Dt || ec(t, n, u, r, m, y, a) || !1) ? (d || typeof l.UNSAFE_componentWillUpdate != "function" && typeof l.componentWillUpdate != "function" || (typeof l.componentWillUpdate == "function" && l.componentWillUpdate(r, y, a),
                        typeof l.UNSAFE_componentWillUpdate == "function" && l.UNSAFE_componentWillUpdate(r, y, a)),
                        typeof l.componentDidUpdate == "function" && (t.flags |= 4),
                        typeof l.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof l.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4),
                            typeof l.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024),
                            t.memoizedProps = r,
                            t.memoizedState = y),
                    l.props = r,
                    l.state = y,
                    l.context = a,
                    r = u) : (typeof l.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4),
                        typeof l.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024),
                        r = !1)
            }
            return ds(e, t, n, r, i, o)
        }
        function ds(e, t, n, r, o, i) {
            Yd(e, t);
            var l = (t.flags & 128) !== 0;
            if (!r && !l)
                return o && Ku(t, n, !1),
                    _t(e, t, i);
            r = t.stateNode,
                vh.current = t;
            var s = l && typeof n.getDerivedStateFromError != "function" ? null : r.render();
            return t.flags |= 1,
                e !== null && l ? (t.child = Xn(t, e.child, null, i),
                    t.child = Xn(t, null, s, i)) : Se(e, t, s, i),
                t.memoizedState = r.state,
                o && Ku(t, n, !0),
                t.child
        }
        function Xd(e) {
            var t = e.stateNode;
            t.pendingContext ? Qu(e, t.pendingContext, t.pendingContext !== t.context) : t.context && Qu(e, t.context, !1),
                Gs(e, t.containerInfo)
        }
        function ac(e, t, n, r, o) {
            return Yn(),
                js(o),
                t.flags |= 256,
                Se(e, t, n, r),
                t.child
        }
        var fs = {
            dehydrated: null,
            treeContext: null,
            retryLane: 0
        };
        function ps(e) {
            return {
                baseLanes: e,
                cachePool: null,
                transitions: null
            }
        }
        function qd(e, t, n) {
            var r = t.pendingProps, o = X.current, i = !1, l = (t.flags & 128) !== 0, s;
            if ((s = l) || (s = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0),
                s ? (i = !0,
                    t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1),
                $(X, o & 1),
                e === null)
                return is(t),
                    e = t.memoizedState,
                    e !== null && (e = e.dehydrated,
                        e !== null) ? ((t.mode & 1) === 0 ? t.lanes = 1 : e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824,
                            null) : (l = r.children,
                                e = r.fallback,
                                i ? (r = t.mode,
                                    i = t.child,
                                    l = {
                                        mode: "hidden",
                                        children: l
                                    },
                                    (r & 1) === 0 && i !== null ? (i.childLanes = 0,
                                        i.pendingProps = l) : i = Pi(l, r, 0, null),
                                    e = fn(e, r, n, null),
                                    i.return = t,
                                    e.return = t,
                                    i.sibling = e,
                                    t.child = i,
                                    t.child.memoizedState = ps(n),
                                    t.memoizedState = fs,
                                    e) : ta(t, l));
            if (o = e.memoizedState,
                o !== null && (s = o.dehydrated,
                    s !== null))
                return yh(e, t, l, r, s, o, n);
            if (i) {
                i = r.fallback,
                    l = t.mode,
                    o = e.child,
                    s = o.sibling;
                var a = {
                    mode: "hidden",
                    children: r.children
                };
                return (l & 1) === 0 && t.child !== o ? (r = t.child,
                    r.childLanes = 0,
                    r.pendingProps = a,
                    t.deletions = null) : (r = Gt(o, a),
                        r.subtreeFlags = o.subtreeFlags & 14680064),
                    s !== null ? i = Gt(s, i) : (i = fn(i, l, n, null),
                        i.flags |= 2),
                    i.return = t,
                    r.return = t,
                    r.sibling = i,
                    t.child = r,
                    r = i,
                    i = t.child,
                    l = e.child.memoizedState,
                    l = l === null ? ps(n) : {
                        baseLanes: l.baseLanes | n,
                        cachePool: null,
                        transitions: l.transitions
                    },
                    i.memoizedState = l,
                    i.childLanes = e.childLanes & ~n,
                    t.memoizedState = fs,
                    r
            }
            return i = e.child,
                e = i.sibling,
                r = Gt(i, {
                    mode: "visible",
                    children: r.children
                }),
                (t.mode & 1) === 0 && (r.lanes = n),
                r.return = t,
                r.sibling = null,
                e !== null && (n = t.deletions,
                    n === null ? (t.deletions = [e],
                        t.flags |= 16) : n.push(e)),
                t.child = r,
                t.memoizedState = null,
                r
        }
        function ta(e, t) {
            return t = Pi({
                mode: "visible",
                children: t
            }, e.mode, 0, null),
                t.return = e,
                e.child = t
        }
        function Io(e, t, n, r) {
            return r !== null && js(r),
                Xn(t, e.child, null, n),
                e = ta(t, t.pendingProps.children),
                e.flags |= 2,
                t.memoizedState = null,
                e
        }
        function yh(e, t, n, r, o, i, l) {
            if (n)
                return t.flags & 256 ? (t.flags &= -257,
                    r = xl(Error(N(422))),
                    Io(e, t, l, r)) : t.memoizedState !== null ? (t.child = e.child,
                        t.flags |= 128,
                        null) : (i = r.fallback,
                            o = t.mode,
                            r = Pi({
                                mode: "visible",
                                children: r.children
                            }, o, 0, null),
                            i = fn(i, o, l, null),
                            i.flags |= 2,
                            r.return = t,
                            i.return = t,
                            r.sibling = i,
                            t.child = r,
                            (t.mode & 1) !== 0 && Xn(t, e.child, null, l),
                            t.child.memoizedState = ps(l),
                            t.memoizedState = fs,
                            i);
            if ((t.mode & 1) === 0)
                return Io(e, t, l, null);
            if (o.data === "$!") {
                if (r = o.nextSibling && o.nextSibling.dataset,
                    r)
                    var s = r.dgst;
                return r = s,
                    i = Error(N(419)),
                    r = xl(i, r, void 0),
                    Io(e, t, l, r)
            }
            if (s = (l & e.childLanes) !== 0,
                Pe || s) {
                if (r = ae,
                    r !== null) {
                    switch (l & -l) {
                        case 4:
                            o = 2;
                            break;
                        case 16:
                            o = 8;
                            break;
                        case 64:
                        case 128:
                        case 256:
                        case 512:
                        case 1024:
                        case 2048:
                        case 4096:
                        case 8192:
                        case 16384:
                        case 32768:
                        case 65536:
                        case 131072:
                        case 262144:
                        case 524288:
                        case 1048576:
                        case 2097152:
                        case 4194304:
                        case 8388608:
                        case 16777216:
                        case 33554432:
                        case 67108864:
                            o = 32;
                            break;
                        case 536870912:
                            o = 268435456;
                            break;
                        default:
                            o = 0
                    }
                    o = (o & (r.suspendedLanes | l)) !== 0 ? 0 : o,
                        o !== 0 && o !== i.retryLane && (i.retryLane = o,
                            Ct(e, o),
                            be(r, e, o, -1))
                }
                return sa(),
                    r = xl(Error(N(421))),
                    Io(e, t, l, r)
            }
            return o.data === "$?" ? (t.flags |= 128,
                t.child = e.child,
                t = Lh.bind(null, e),
                o._reactRetry = t,
                null) : (e = i.treeContext,
                    Re = Ht(o.nextSibling),
                    Ie = t,
                    G = !0,
                    Ze = null,
                    e !== null && (We[Ue++] = wt,
                        We[Ue++] = kt,
                        We[Ue++] = mn,
                        wt = e.id,
                        kt = e.overflow,
                        mn = t),
                    t = ta(t, r.children),
                    t.flags |= 4096,
                    t)
        }
        function uc(e, t, n) {
            e.lanes |= t;
            var r = e.alternate;
            r !== null && (r.lanes |= t),
                ls(e.return, t, n)
        }
        function Tl(e, t, n, r, o) {
            var i = e.memoizedState;
            i === null ? e.memoizedState = {
                isBackwards: t,
                rendering: null,
                renderingStartTime: 0,
                last: r,
                tail: n,
                tailMode: o
            } : (i.isBackwards = t,
                i.rendering = null,
                i.renderingStartTime = 0,
                i.last = r,
                i.tail = n,
                i.tailMode = o)
        }
        function Zd(e, t, n) {
            var r = t.pendingProps
                , o = r.revealOrder
                , i = r.tail;
            if (Se(e, t, r.children, n),
                r = X.current,
                (r & 2) !== 0)
                r = r & 1 | 2,
                    t.flags |= 128;
            else {
                if (e !== null && (e.flags & 128) !== 0)
                    e: for (e = t.child; e !== null;) {
                        if (e.tag === 13)
                            e.memoizedState !== null && uc(e, n, t);
                        else if (e.tag === 19)
                            uc(e, n, t);
                        else if (e.child !== null) {
                            e.child.return = e,
                                e = e.child;
                            continue
                        }
                        if (e === t)
                            break e;
                        for (; e.sibling === null;) {
                            if (e.return === null || e.return === t)
                                break e;
                            e = e.return
                        }
                        e.sibling.return = e.return,
                            e = e.sibling
                    }
                r &= 1
            }
            if ($(X, r),
                (t.mode & 1) === 0)
                t.memoizedState = null;
            else
                switch (o) {
                    case "forwards":
                        for (n = t.child,
                            o = null; n !== null;)
                            e = n.alternate,
                                e !== null && ai(e) === null && (o = n),
                                n = n.sibling;
                        n = o,
                            n === null ? (o = t.child,
                                t.child = null) : (o = n.sibling,
                                    n.sibling = null),
                            Tl(t, !1, o, n, i);
                        break;
                    case "backwards":
                        for (n = null,
                            o = t.child,
                            t.child = null; o !== null;) {
                            if (e = o.alternate,
                                e !== null && ai(e) === null) {
                                t.child = o;
                                break
                            }
                            e = o.sibling,
                                o.sibling = n,
                                n = o,
                                o = e
                        }
                        Tl(t, !0, n, null, i);
                        break;
                    case "together":
                        Tl(t, !1, null, null, void 0);
                        break;
                    default:
                        t.memoizedState = null
                }
            return t.child
        }
        function Vo(e, t) {
            (t.mode & 1) === 0 && e !== null && (e.alternate = null,
                t.alternate = null,
                t.flags |= 2)
        }
        function _t(e, t, n) {
            if (e !== null && (t.dependencies = e.dependencies),
                vn |= t.lanes,
                (n & t.childLanes) === 0)
                return null;
            if (e !== null && t.child !== e.child)
                throw Error(N(153));
            if (t.child !== null) {
                for (e = t.child,
                    n = Gt(e, e.pendingProps),
                    t.child = n,
                    n.return = t; e.sibling !== null;)
                    e = e.sibling,
                        n = n.sibling = Gt(e, e.pendingProps),
                        n.return = t;
                n.sibling = null
            }
            return t.child
        }
        function gh(e, t, n) {
            switch (t.tag) {
                case 3:
                    Xd(t),
                        Yn();
                    break;
                case 5:
                    Ed(t);
                    break;
                case 1:
                    Te(t.type) && ni(t);
                    break;
                case 4:
                    Gs(t, t.stateNode.containerInfo);
                    break;
                case 10:
                    var r = t.type._context
                        , o = t.memoizedProps.value;
                    $(ii, r._currentValue),
                        r._currentValue = o;
                    break;
                case 13:
                    if (r = t.memoizedState,
                        r !== null)
                        return r.dehydrated !== null ? ($(X, X.current & 1),
                            t.flags |= 128,
                            null) : (n & t.child.childLanes) !== 0 ? qd(e, t, n) : ($(X, X.current & 1),
                                e = _t(e, t, n),
                                e !== null ? e.sibling : null);
                    $(X, X.current & 1);
                    break;
                case 19:
                    if (r = (n & t.childLanes) !== 0,
                        (e.flags & 128) !== 0) {
                        if (r)
                            return Zd(e, t, n);
                        t.flags |= 128
                    }
                    if (o = t.memoizedState,
                        o !== null && (o.rendering = null,
                            o.tail = null,
                            o.lastEffect = null),
                        $(X, X.current),
                        r)
                        break;
                    return null;
                case 22:
                case 23:
                    return t.lanes = 0,
                        Gd(e, t, n)
            }
            return _t(e, t, n)
        }
        var Jd, ms, bd, ef;
        Jd = function (e, t) {
            for (var n = t.child; n !== null;) {
                if (n.tag === 5 || n.tag === 6)
                    e.appendChild(n.stateNode);
                else if (n.tag !== 4 && n.child !== null) {
                    n.child.return = n,
                        n = n.child;
                    continue
                }
                if (n === t)
                    break;
                for (; n.sibling === null;) {
                    if (n.return === null || n.return === t)
                        return;
                    n = n.return
                }
                n.sibling.return = n.return,
                    n = n.sibling
            }
        }
            ;
        ms = function () { }
            ;
        bd = function (e, t, n, r) {
            var o = e.memoizedProps;
            if (o !== r) {
                e = t.stateNode,
                    cn(ut.current);
                var i = null;
                switch (n) {
                    case "input":
                        o = Ol(e, o),
                            r = Ol(e, r),
                            i = [];
                        break;
                    case "select":
                        o = Z({}, o, {
                            value: void 0
                        }),
                            r = Z({}, r, {
                                value: void 0
                            }),
                            i = [];
                        break;
                    case "textarea":
                        o = Wl(e, o),
                            r = Wl(e, r),
                            i = [];
                        break;
                    default:
                        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = ei)
                }
                jl(n, r);
                var l;
                n = null;
                for (u in o)
                    if (!r.hasOwnProperty(u) && o.hasOwnProperty(u) && o[u] != null)
                        if (u === "style") {
                            var s = o[u];
                            for (l in s)
                                s.hasOwnProperty(l) && (n || (n = {}),
                                    n[l] = "")
                        } else
                            u !== "dangerouslySetInnerHTML" && u !== "children" && u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (zr.hasOwnProperty(u) ? i || (i = []) : (i = i || []).push(u, null));
                for (u in r) {
                    var a = r[u];
                    if (s = o?.[u],
                        r.hasOwnProperty(u) && a !== s && (a != null || s != null))
                        if (u === "style")
                            if (s) {
                                for (l in s)
                                    !s.hasOwnProperty(l) || a && a.hasOwnProperty(l) || (n || (n = {}),
                                        n[l] = "");
                                for (l in a)
                                    a.hasOwnProperty(l) && s[l] !== a[l] && (n || (n = {}),
                                        n[l] = a[l])
                            } else
                                n || (i || (i = []),
                                    i.push(u, n)),
                                    n = a;
                        else
                            u === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0,
                                s = s ? s.__html : void 0,
                                a != null && s !== a && (i = i || []).push(u, a)) : u === "children" ? typeof a != "string" && typeof a != "number" || (i = i || []).push(u, "" + a) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (zr.hasOwnProperty(u) ? (a != null && u === "onScroll" && Q("scroll", e),
                                    i || s === a || (i = [])) : (i = i || []).push(u, a))
                }
                n && (i = i || []).push("style", n);
                var u = i;
                (t.updateQueue = u) && (t.flags |= 4)
            }
        }
            ;
        ef = function (e, t, n, r) {
            n !== r && (t.flags |= 4)
        }
            ;
        function hr(e, t) {
            if (!G)
                switch (e.tailMode) {
                    case "hidden":
                        t = e.tail;
                        for (var n = null; t !== null;)
                            t.alternate !== null && (n = t),
                                t = t.sibling;
                        n === null ? e.tail = null : n.sibling = null;
                        break;
                    case "collapsed":
                        n = e.tail;
                        for (var r = null; n !== null;)
                            n.alternate !== null && (r = n),
                                n = n.sibling;
                        r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null
                }
        }
        function he(e) {
            var t = e.alternate !== null && e.alternate.child === e.child
                , n = 0
                , r = 0;
            if (t)
                for (var o = e.child; o !== null;)
                    n |= o.lanes | o.childLanes,
                        r |= o.subtreeFlags & 14680064,
                        r |= o.flags & 14680064,
                        o.return = e,
                        o = o.sibling;
            else
                for (o = e.child; o !== null;)
                    n |= o.lanes | o.childLanes,
                        r |= o.subtreeFlags,
                        r |= o.flags,
                        o.return = e,
                        o = o.sibling;
            return e.subtreeFlags |= r,
                e.childLanes = n,
                t
        }
        function wh(e, t, n) {
            var r = t.pendingProps;
            switch (Us(t),
            t.tag) {
                case 2:
                case 16:
                case 15:
                case 0:
                case 11:
                case 7:
                case 8:
                case 12:
                case 9:
                case 14:
                    return he(t),
                        null;
                case 1:
                    return Te(t.type) && ti(),
                        he(t),
                        null;
                case 3:
                    return r = t.stateNode,
                        qn(),
                        K(xe),
                        K(ye),
                        Xs(),
                        r.pendingContext && (r.context = r.pendingContext,
                            r.pendingContext = null),
                        (e === null || e.child === null) && (zo(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024,
                            Ze !== null && (Ns(Ze),
                                Ze = null))),
                        ms(e, t),
                        he(t),
                        null;
                case 5:
                    Ys(t);
                    var o = cn(Hr.current);
                    if (n = t.type,
                        e !== null && t.stateNode != null)
                        bd(e, t, n, r, o),
                            e.ref !== t.ref && (t.flags |= 512,
                                t.flags |= 2097152);
                    else {
                        if (!r) {
                            if (t.stateNode === null)
                                throw Error(N(166));
                            return he(t),
                                null
                        }
                        if (e = cn(ut.current),
                            zo(t)) {
                            r = t.stateNode,
                                n = t.type;
                            var i = t.memoizedProps;
                            switch (r[st] = t,
                            r[jr] = i,
                            e = (t.mode & 1) !== 0,
                            n) {
                                case "dialog":
                                    Q("cancel", r),
                                        Q("close", r);
                                    break;
                                case "iframe":
                                case "object":
                                case "embed":
                                    Q("load", r);
                                    break;
                                case "video":
                                case "audio":
                                    for (o = 0; o < Sr.length; o++)
                                        Q(Sr[o], r);
                                    break;
                                case "source":
                                    Q("error", r);
                                    break;
                                case "img":
                                case "image":
                                case "link":
                                    Q("error", r),
                                        Q("load", r);
                                    break;
                                case "details":
                                    Q("toggle", r);
                                    break;
                                case "input":
                                    yu(r, i),
                                        Q("invalid", r);
                                    break;
                                case "select":
                                    r._wrapperState = {
                                        wasMultiple: !!i.multiple
                                    },
                                        Q("invalid", r);
                                    break;
                                case "textarea":
                                    wu(r, i),
                                        Q("invalid", r)
                            }
                            jl(n, i),
                                o = null;
                            for (var l in i)
                                if (i.hasOwnProperty(l)) {
                                    var s = i[l];
                                    l === "children" ? typeof s == "string" ? r.textContent !== s && (i.suppressHydrationWarning !== !0 && Lo(r.textContent, s, e),
                                        o = ["children", s]) : typeof s == "number" && r.textContent !== "" + s && (i.suppressHydrationWarning !== !0 && Lo(r.textContent, s, e),
                                            o = ["children", "" + s]) : zr.hasOwnProperty(l) && s != null && l === "onScroll" && Q("scroll", r)
                                }
                            switch (n) {
                                case "input":
                                    go(r),
                                        gu(r, i, !0);
                                    break;
                                case "textarea":
                                    go(r),
                                        ku(r);
                                    break;
                                case "select":
                                case "option":
                                    break;
                                default:
                                    typeof i.onClick == "function" && (r.onclick = ei)
                            }
                            r = o,
                                t.updateQueue = r,
                                r !== null && (t.flags |= 4)
                        } else {
                            l = o.nodeType === 9 ? o : o.ownerDocument,
                                e === "http://www.w3.org/1999/xhtml" && (e = Tc(n)),
                                e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = l.createElement("div"),
                                    e.innerHTML = "<script><\/script>",
                                    e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = l.createElement(n, {
                                        is: r.is
                                    }) : (e = l.createElement(n),
                                        n === "select" && (l = e,
                                            r.multiple ? l.multiple = !0 : r.size && (l.size = r.size))) : e = l.createElementNS(e, n),
                                e[st] = t,
                                e[jr] = r,
                                Jd(e, t, !1, !1),
                                t.stateNode = e;
                            e: {
                                switch (l = Vl(n, r),
                                n) {
                                    case "dialog":
                                        Q("cancel", e),
                                            Q("close", e),
                                            o = r;
                                        break;
                                    case "iframe":
                                    case "object":
                                    case "embed":
                                        Q("load", e),
                                            o = r;
                                        break;
                                    case "video":
                                    case "audio":
                                        for (o = 0; o < Sr.length; o++)
                                            Q(Sr[o], e);
                                        o = r;
                                        break;
                                    case "source":
                                        Q("error", e),
                                            o = r;
                                        break;
                                    case "img":
                                    case "image":
                                    case "link":
                                        Q("error", e),
                                            Q("load", e),
                                            o = r;
                                        break;
                                    case "details":
                                        Q("toggle", e),
                                            o = r;
                                        break;
                                    case "input":
                                        yu(e, r),
                                            o = Ol(e, r),
                                            Q("invalid", e);
                                        break;
                                    case "option":
                                        o = r;
                                        break;
                                    case "select":
                                        e._wrapperState = {
                                            wasMultiple: !!r.multiple
                                        },
                                            o = Z({}, r, {
                                                value: void 0
                                            }),
                                            Q("invalid", e);
                                        break;
                                    case "textarea":
                                        wu(e, r),
                                            o = Wl(e, r),
                                            Q("invalid", e);
                                        break;
                                    default:
                                        o = r
                                }
                                jl(n, o),
                                    s = o;
                                for (i in s)
                                    if (s.hasOwnProperty(i)) {
                                        var a = s[i];
                                        i === "style" ? zc(e, a) : i === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0,
                                            a != null && Mc(e, a)) : i === "children" ? typeof a == "string" ? (n !== "textarea" || a !== "") && Rr(e, a) : typeof a == "number" && Rr(e, "" + a) : i !== "suppressContentEditableWarning" && i !== "suppressHydrationWarning" && i !== "autoFocus" && (zr.hasOwnProperty(i) ? a != null && i === "onScroll" && Q("scroll", e) : a != null && _s(e, i, a, l))
                                    }
                                switch (n) {
                                    case "input":
                                        go(e),
                                            gu(e, r, !1);
                                        break;
                                    case "textarea":
                                        go(e),
                                            ku(e);
                                        break;
                                    case "option":
                                        r.value != null && e.setAttribute("value", "" + Yt(r.value));
                                        break;
                                    case "select":
                                        e.multiple = !!r.multiple,
                                            i = r.value,
                                            i != null ? Un(e, !!r.multiple, i, !1) : r.defaultValue != null && Un(e, !!r.multiple, r.defaultValue, !0);
                                        break;
                                    default:
                                        typeof o.onClick == "function" && (e.onclick = ei)
                                }
                                switch (n) {
                                    case "button":
                                    case "input":
                                    case "select":
                                    case "textarea":
                                        r = !!r.autoFocus;
                                        break e;
                                    case "img":
                                        r = !0;
                                        break e;
                                    default:
                                        r = !1
                                }
                            }
                            r && (t.flags |= 4)
                        }
                        t.ref !== null && (t.flags |= 512,
                            t.flags |= 2097152)
                    }
                    return he(t),
                        null;
                case 6:
                    if (e && t.stateNode != null)
                        ef(e, t, e.memoizedProps, r);
                    else {
                        if (typeof r != "string" && t.stateNode === null)
                            throw Error(N(166));
                        if (n = cn(Hr.current),
                            cn(ut.current),
                            zo(t)) {
                            if (r = t.stateNode,
                                n = t.memoizedProps,
                                r[st] = t,
                                (i = r.nodeValue !== n) && (e = Ie,
                                    e !== null))
                                switch (e.tag) {
                                    case 3:
                                        Lo(r.nodeValue, n, (e.mode & 1) !== 0);
                                        break;
                                    case 5:
                                        e.memoizedProps.suppressHydrationWarning !== !0 && Lo(r.nodeValue, n, (e.mode & 1) !== 0)
                                }
                            i && (t.flags |= 4)
                        } else
                            r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r),
                                r[st] = t,
                                t.stateNode = r
                    }
                    return he(t),
                        null;
                case 13:
                    if (K(X),
                        r = t.memoizedState,
                        e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
                        if (G && Re !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0)
                            gd(),
                                Yn(),
                                t.flags |= 98560,
                                i = !1;
                        else if (i = zo(t),
                            r !== null && r.dehydrated !== null) {
                            if (e === null) {
                                if (!i)
                                    throw Error(N(318));
                                if (i = t.memoizedState,
                                    i = i !== null ? i.dehydrated : null,
                                    !i)
                                    throw Error(N(317));
                                i[st] = t
                            } else
                                Yn(),
                                    (t.flags & 128) === 0 && (t.memoizedState = null),
                                    t.flags |= 4;
                            he(t),
                                i = !1
                        } else
                            Ze !== null && (Ns(Ze),
                                Ze = null),
                                i = !0;
                        if (!i)
                            return t.flags & 65536 ? t : null
                    }
                    return (t.flags & 128) !== 0 ? (t.lanes = n,
                        t) : (r = r !== null,
                            r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192,
                                (t.mode & 1) !== 0 && (e === null || (X.current & 1) !== 0 ? ie === 0 && (ie = 3) : sa())),
                            t.updateQueue !== null && (t.flags |= 4),
                            he(t),
                            null);
                case 4:
                    return qn(),
                        ms(e, t),
                        e === null && Wr(t.stateNode.containerInfo),
                        he(t),
                        null;
                case 10:
                    return $s(t.type._context),
                        he(t),
                        null;
                case 17:
                    return Te(t.type) && ti(),
                        he(t),
                        null;
                case 19:
                    if (K(X),
                        i = t.memoizedState,
                        i === null)
                        return he(t),
                            null;
                    if (r = (t.flags & 128) !== 0,
                        l = i.rendering,
                        l === null)
                        if (r)
                            hr(i, !1);
                        else {
                            if (ie !== 0 || e !== null && (e.flags & 128) !== 0)
                                for (e = t.child; e !== null;) {
                                    if (l = ai(e),
                                        l !== null) {
                                        for (t.flags |= 128,
                                            hr(i, !1),
                                            r = l.updateQueue,
                                            r !== null && (t.updateQueue = r,
                                                t.flags |= 4),
                                            t.subtreeFlags = 0,
                                            r = n,
                                            n = t.child; n !== null;)
                                            i = n,
                                                e = r,
                                                i.flags &= 14680066,
                                                l = i.alternate,
                                                l === null ? (i.childLanes = 0,
                                                    i.lanes = e,
                                                    i.child = null,
                                                    i.subtreeFlags = 0,
                                                    i.memoizedProps = null,
                                                    i.memoizedState = null,
                                                    i.updateQueue = null,
                                                    i.dependencies = null,
                                                    i.stateNode = null) : (i.childLanes = l.childLanes,
                                                        i.lanes = l.lanes,
                                                        i.child = l.child,
                                                        i.subtreeFlags = 0,
                                                        i.deletions = null,
                                                        i.memoizedProps = l.memoizedProps,
                                                        i.memoizedState = l.memoizedState,
                                                        i.updateQueue = l.updateQueue,
                                                        i.type = l.type,
                                                        e = l.dependencies,
                                                        i.dependencies = e === null ? null : {
                                                            lanes: e.lanes,
                                                            firstContext: e.firstContext
                                                        }),
                                                n = n.sibling;
                                        return $(X, X.current & 1 | 2),
                                            t.child
                                    }
                                    e = e.sibling
                                }
                            i.tail !== null && te() > Jn && (t.flags |= 128,
                                r = !0,
                                hr(i, !1),
                                t.lanes = 4194304)
                        }
                    else {
                        if (!r)
                            if (e = ai(l),
                                e !== null) {
                                if (t.flags |= 128,
                                    r = !0,
                                    n = e.updateQueue,
                                    n !== null && (t.updateQueue = n,
                                        t.flags |= 4),
                                    hr(i, !0),
                                    i.tail === null && i.tailMode === "hidden" && !l.alternate && !G)
                                    return he(t),
                                        null
                            } else
                                2 * te() - i.renderingStartTime > Jn && n !== 1073741824 && (t.flags |= 128,
                                    r = !0,
                                    hr(i, !1),
                                    t.lanes = 4194304);
                        i.isBackwards ? (l.sibling = t.child,
                            t.child = l) : (n = i.last,
                                n !== null ? n.sibling = l : t.child = l,
                                i.last = l)
                    }
                    return i.tail !== null ? (t = i.tail,
                        i.rendering = t,
                        i.tail = t.sibling,
                        i.renderingStartTime = te(),
                        t.sibling = null,
                        n = X.current,
                        $(X, r ? n & 1 | 2 : n & 1),
                        t) : (he(t),
                            null);
                case 22:
                case 23:
                    return la(),
                        r = t.memoizedState !== null,
                        e !== null && e.memoizedState !== null !== r && (t.flags |= 8192),
                        r && (t.mode & 1) !== 0 ? (ze & 1073741824) !== 0 && (he(t),
                            t.subtreeFlags & 6 && (t.flags |= 8192)) : he(t),
                        null;
                case 24:
                    return null;
                case 25:
                    return null
            }
            throw Error(N(156, t.tag))
        }
        function kh(e, t) {
            switch (Us(t),
            t.tag) {
                case 1:
                    return Te(t.type) && ti(),
                        e = t.flags,
                        e & 65536 ? (t.flags = e & -65537 | 128,
                            t) : null;
                case 3:
                    return qn(),
                        K(xe),
                        K(ye),
                        Xs(),
                        e = t.flags,
                        (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128,
                            t) : null;
                case 5:
                    return Ys(t),
                        null;
                case 13:
                    if (K(X),
                        e = t.memoizedState,
                        e !== null && e.dehydrated !== null) {
                        if (t.alternate === null)
                            throw Error(N(340));
                        Yn()
                    }
                    return e = t.flags,
                        e & 65536 ? (t.flags = e & -65537 | 128,
                            t) : null;
                case 19:
                    return K(X),
                        null;
                case 4:
                    return qn(),
                        null;
                case 10:
                    return $s(t.type._context),
                        null;
                case 22:
                case 23:
                    return la(),
                        null;
                case 24:
                    return null;
                default:
                    return null
            }
        }
        var Fo = !1
            , ve = !1
            , Sh = typeof WeakSet == "function" ? WeakSet : Set
            , T = null;
        function Bn(e, t) {
            var n = e.ref;
            if (n !== null)
                if (typeof n == "function")
                    try {
                        n(null)
                    } catch (r) {
                        b(e, t, r)
                    }
                else
                    n.current = null
        }
        function hs(e, t, n) {
            try {
                n()
            } catch (r) {
                b(e, t, r)
            }
        }
        var cc = !1;
        function Nh(e, t) {
            if (Jl = Zo,
                e = id(),
                Bs(e)) {
                if ("selectionStart" in e)
                    var n = {
                        start: e.selectionStart,
                        end: e.selectionEnd
                    };
                else
                    e: {
                        n = (n = e.ownerDocument) && n.defaultView || window;
                        var r = n.getSelection && n.getSelection();
                        if (r && r.rangeCount !== 0) {
                            n = r.anchorNode;
                            var o = r.anchorOffset
                                , i = r.focusNode;
                            r = r.focusOffset;
                            try {
                                n.nodeType,
                                    i.nodeType
                            } catch {
                                n = null;
                                break e
                            }
                            var l = 0
                                , s = -1
                                , a = -1
                                , u = 0
                                , d = 0
                                , h = e
                                , m = null;
                            t: for (; ;) {
                                for (var v; h !== n || o !== 0 && h.nodeType !== 3 || (s = l + o),
                                    h !== i || r !== 0 && h.nodeType !== 3 || (a = l + r),
                                    h.nodeType === 3 && (l += h.nodeValue.length),
                                    (v = h.firstChild) !== null;)
                                    m = h,
                                        h = v;
                                for (; ;) {
                                    if (h === e)
                                        break t;
                                    if (m === n && ++u === o && (s = l),
                                        m === i && ++d === r && (a = l),
                                        (v = h.nextSibling) !== null)
                                        break;
                                    h = m,
                                        m = h.parentNode
                                }
                                h = v
                            }
                            n = s === -1 || a === -1 ? null : {
                                start: s,
                                end: a
                            }
                        } else
                            n = null
                    }
                n = n || {
                    start: 0,
                    end: 0
                }
            } else
                n = null;
            for (bl = {
                focusedElem: e,
                selectionRange: n
            },
                Zo = !1,
                T = t; T !== null;)
                if (t = T,
                    e = t.child,
                    (t.subtreeFlags & 1028) !== 0 && e !== null)
                    e.return = t,
                        T = e;
                else
                    for (; T !== null;) {
                        t = T;
                        try {
                            var y = t.alternate;
                            if ((t.flags & 1024) !== 0)
                                switch (t.tag) {
                                    case 0:
                                    case 11:
                                    case 15:
                                        break;
                                    case 1:
                                        if (y !== null) {
                                            var S = y.memoizedProps
                                                , L = y.memoizedState
                                                , f = t.stateNode
                                                , c = f.getSnapshotBeforeUpdate(t.elementType === t.type ? S : Xe(t.type, S), L);
                                            f.__reactInternalSnapshotBeforeUpdate = c
                                        }
                                        break;
                                    case 3:
                                        var p = t.stateNode.containerInfo;
                                        p.nodeType === 1 ? p.textContent = "" : p.nodeType === 9 && p.documentElement && p.removeChild(p.documentElement);
                                        break;
                                    case 5:
                                    case 6:
                                    case 4:
                                    case 17:
                                        break;
                                    default:
                                        throw Error(N(163))
                                }
                        } catch (g) {
                            b(t, t.return, g)
                        }
                        if (e = t.sibling,
                            e !== null) {
                            e.return = t.return,
                                T = e;
                            break
                        }
                        T = t.return
                    }
            return y = cc,
                cc = !1,
                y
        }
        function Tr(e, t, n) {
            var r = t.updateQueue;
            if (r = r !== null ? r.lastEffect : null,
                r !== null) {
                var o = r = r.next;
                do {
                    if ((o.tag & e) === e) {
                        var i = o.destroy;
                        o.destroy = void 0,
                            i !== void 0 && hs(t, n, i)
                    }
                    o = o.next
                } while (o !== r)
            }
        }
        function Ci(e, t) {
            if (t = t.updateQueue,
                t = t !== null ? t.lastEffect : null,
                t !== null) {
                var n = t = t.next;
                do {
                    if ((n.tag & e) === e) {
                        var r = n.create;
                        n.destroy = r()
                    }
                    n = n.next
                } while (n !== t)
            }
        }
        function vs(e) {
            var t = e.ref;
            if (t !== null) {
                var n = e.stateNode;
                switch (e.tag) {
                    case 5:
                        e = n;
                        break;
                    default:
                        e = n
                }
                typeof t == "function" ? t(e) : t.current = e
            }
        }
        function tf(e) {
            var t = e.alternate;
            t !== null && (e.alternate = null,
                tf(t)),
                e.child = null,
                e.deletions = null,
                e.sibling = null,
                e.tag === 5 && (t = e.stateNode,
                    t !== null && (delete t[st],
                        delete t[jr],
                        delete t[ns],
                        delete t[oh],
                        delete t[ih])),
                e.stateNode = null,
                e.return = null,
                e.dependencies = null,
                e.memoizedProps = null,
                e.memoizedState = null,
                e.pendingProps = null,
                e.stateNode = null,
                e.updateQueue = null
        }
        function nf(e) {
            return e.tag === 5 || e.tag === 3 || e.tag === 4
        }
        function dc(e) {
            e: for (; ;) {
                for (; e.sibling === null;) {
                    if (e.return === null || nf(e.return))
                        return null;
                    e = e.return
                }
                for (e.sibling.return = e.return,
                    e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
                    if (e.flags & 2 || e.child === null || e.tag === 4)
                        continue e;
                    e.child.return = e,
                        e = e.child
                }
                if (!(e.flags & 2))
                    return e.stateNode
            }
        }
        function ys(e, t, n) {
            var r = e.tag;
            if (r === 5 || r === 6)
                e = e.stateNode,
                    t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode,
                        t.insertBefore(e, n)) : (t = n,
                            t.appendChild(e)),
                        n = n._reactRootContainer,
                        n != null || t.onclick !== null || (t.onclick = ei));
            else if (r !== 4 && (e = e.child,
                e !== null))
                for (ys(e, t, n),
                    e = e.sibling; e !== null;)
                    ys(e, t, n),
                        e = e.sibling
        }
        function gs(e, t, n) {
            var r = e.tag;
            if (r === 5 || r === 6)
                e = e.stateNode,
                    t ? n.insertBefore(e, t) : n.appendChild(e);
            else if (r !== 4 && (e = e.child,
                e !== null))
                for (gs(e, t, n),
                    e = e.sibling; e !== null;)
                    gs(e, t, n),
                        e = e.sibling
        }
        var ce = null
            , qe = !1;
        function It(e, t, n) {
            for (n = n.child; n !== null;)
                rf(e, t, n),
                    n = n.sibling
        }
        function rf(e, t, n) {
            if (at && typeof at.onCommitFiberUnmount == "function")
                try {
                    at.onCommitFiberUnmount(vi, n)
                } catch { }
            switch (n.tag) {
                case 5:
                    ve || Bn(n, t);
                case 6:
                    var r = ce
                        , o = qe;
                    ce = null,
                        It(e, t, n),
                        ce = r,
                        qe = o,
                        ce !== null && (qe ? (e = ce,
                            n = n.stateNode,
                            e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : ce.removeChild(n.stateNode));
                    break;
                case 18:
                    ce !== null && (qe ? (e = ce,
                        n = n.stateNode,
                        e.nodeType === 8 ? Sl(e.parentNode, n) : e.nodeType === 1 && Sl(e, n),
                        Or(e)) : Sl(ce, n.stateNode));
                    break;
                case 4:
                    r = ce,
                        o = qe,
                        ce = n.stateNode.containerInfo,
                        qe = !0,
                        It(e, t, n),
                        ce = r,
                        qe = o;
                    break;
                case 0:
                case 11:
                case 14:
                case 15:
                    if (!ve && (r = n.updateQueue,
                        r !== null && (r = r.lastEffect,
                            r !== null))) {
                        o = r = r.next;
                        do {
                            var i = o
                                , l = i.destroy;
                            i = i.tag,
                                l !== void 0 && ((i & 2) !== 0 || (i & 4) !== 0) && hs(n, t, l),
                                o = o.next
                        } while (o !== r)
                    }
                    It(e, t, n);
                    break;
                case 1:
                    if (!ve && (Bn(n, t),
                        r = n.stateNode,
                        typeof r.componentWillUnmount == "function"))
                        try {
                            r.props = n.memoizedProps,
                                r.state = n.memoizedState,
                                r.componentWillUnmount()
                        } catch (s) {
                            b(n, t, s)
                        }
                    It(e, t, n);
                    break;
                case 21:
                    It(e, t, n);
                    break;
                case 22:
                    n.mode & 1 ? (ve = (r = ve) || n.memoizedState !== null,
                        It(e, t, n),
                        ve = r) : It(e, t, n);
                    break;
                default:
                    It(e, t, n)
            }
        }
        function fc(e) {
            var t = e.updateQueue;
            if (t !== null) {
                e.updateQueue = null;
                var n = e.stateNode;
                n === null && (n = e.stateNode = new Sh),
                    t.forEach(function (r) {
                        var o = zh.bind(null, e, r);
                        n.has(r) || (n.add(r),
                            r.then(o, o))
                    })
            }
        }
        function Ye(e, t) {
            var n = t.deletions;
            if (n !== null)
                for (var r = 0; r < n.length; r++) {
                    var o = n[r];
                    try {
                        var i = e
                            , l = t
                            , s = l;
                        e: for (; s !== null;) {
                            switch (s.tag) {
                                case 5:
                                    ce = s.stateNode,
                                        qe = !1;
                                    break e;
                                case 3:
                                    ce = s.stateNode.containerInfo,
                                        qe = !0;
                                    break e;
                                case 4:
                                    ce = s.stateNode.containerInfo,
                                        qe = !0;
                                    break e
                            }
                            s = s.return
                        }
                        if (ce === null)
                            throw Error(N(160));
                        rf(i, l, o),
                            ce = null,
                            qe = !1;
                        var a = o.alternate;
                        a !== null && (a.return = null),
                            o.return = null
                    } catch (u) {
                        b(o, t, u)
                    }
                }
            if (t.subtreeFlags & 12854)
                for (t = t.child; t !== null;)
                    of(t, e),
                        t = t.sibling
        }
        function of(e, t) {
            var n = e.alternate
                , r = e.flags;
            switch (e.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                    if (Ye(t, e),
                        it(e),
                        r & 4) {
                        try {
                            Tr(3, e, e.return),
                                Ci(3, e)
                        } catch (S) {
                            b(e, e.return, S)
                        }
                        try {
                            Tr(5, e, e.return)
                        } catch (S) {
                            b(e, e.return, S)
                        }
                    }
                    break;
                case 1:
                    Ye(t, e),
                        it(e),
                        r & 512 && n !== null && Bn(n, n.return);
                    break;
                case 5:
                    if (Ye(t, e),
                        it(e),
                        r & 512 && n !== null && Bn(n, n.return),
                        e.flags & 32) {
                        var o = e.stateNode;
                        try {
                            Rr(o, "")
                        } catch (S) {
                            b(e, e.return, S)
                        }
                    }
                    if (r & 4 && (o = e.stateNode,
                        o != null)) {
                        var i = e.memoizedProps
                            , l = n !== null ? n.memoizedProps : i
                            , s = e.type
                            , a = e.updateQueue;
                        if (e.updateQueue = null,
                            a !== null)
                            try {
                                s === "input" && i.type === "radio" && i.name != null && Pc(o, i),
                                    Vl(s, l);
                                var u = Vl(s, i);
                                for (l = 0; l < a.length; l += 2) {
                                    var d = a[l]
                                        , h = a[l + 1];
                                    d === "style" ? zc(o, h) : d === "dangerouslySetInnerHTML" ? Mc(o, h) : d === "children" ? Rr(o, h) : _s(o, d, h, u)
                                }
                                switch (s) {
                                    case "input":
                                        Al(o, i);
                                        break;
                                    case "textarea":
                                        xc(o, i);
                                        break;
                                    case "select":
                                        var m = o._wrapperState.wasMultiple;
                                        o._wrapperState.wasMultiple = !!i.multiple;
                                        var v = i.value;
                                        v != null ? Un(o, !!i.multiple, v, !1) : m !== !!i.multiple && (i.defaultValue != null ? Un(o, !!i.multiple, i.defaultValue, !0) : Un(o, !!i.multiple, i.multiple ? [] : "", !1))
                                }
                                o[jr] = i
                            } catch (S) {
                                b(e, e.return, S)
                            }
                    }
                    break;
                case 6:
                    if (Ye(t, e),
                        it(e),
                        r & 4) {
                        if (e.stateNode === null)
                            throw Error(N(162));
                        o = e.stateNode,
                            i = e.memoizedProps;
                        try {
                            o.nodeValue = i
                        } catch (S) {
                            b(e, e.return, S)
                        }
                    }
                    break;
                case 3:
                    if (Ye(t, e),
                        it(e),
                        r & 4 && n !== null && n.memoizedState.isDehydrated)
                        try {
                            Or(t.containerInfo)
                        } catch (S) {
                            b(e, e.return, S)
                        }
                    break;
                case 4:
                    Ye(t, e),
                        it(e);
                    break;
                case 13:
                    Ye(t, e),
                        it(e),
                        o = e.child,
                        o.flags & 8192 && (i = o.memoizedState !== null,
                            o.stateNode.isHidden = i,
                            !i || o.alternate !== null && o.alternate.memoizedState !== null || (oa = te())),
                        r & 4 && fc(e);
                    break;
                case 22:
                    if (d = n !== null && n.memoizedState !== null,
                        e.mode & 1 ? (ve = (u = ve) || d,
                            Ye(t, e),
                            ve = u) : Ye(t, e),
                        it(e),
                        r & 8192) {
                        if (u = e.memoizedState !== null,
                            (e.stateNode.isHidden = u) && !d && (e.mode & 1) !== 0)
                            for (T = e,
                                d = e.child; d !== null;) {
                                for (h = T = d; T !== null;) {
                                    switch (m = T,
                                    v = m.child,
                                    m.tag) {
                                        case 0:
                                        case 11:
                                        case 14:
                                        case 15:
                                            Tr(4, m, m.return);
                                            break;
                                        case 1:
                                            Bn(m, m.return);
                                            var y = m.stateNode;
                                            if (typeof y.componentWillUnmount == "function") {
                                                r = m,
                                                    n = m.return;
                                                try {
                                                    t = r,
                                                        y.props = t.memoizedProps,
                                                        y.state = t.memoizedState,
                                                        y.componentWillUnmount()
                                                } catch (S) {
                                                    b(r, n, S)
                                                }
                                            }
                                            break;
                                        case 5:
                                            Bn(m, m.return);
                                            break;
                                        case 22:
                                            if (m.memoizedState !== null) {
                                                mc(h);
                                                continue
                                            }
                                    }
                                    v !== null ? (v.return = m,
                                        T = v) : mc(h)
                                }
                                d = d.sibling
                            }
                        e: for (d = null,
                            h = e; ;) {
                            if (h.tag === 5) {
                                if (d === null) {
                                    d = h;
                                    try {
                                        o = h.stateNode,
                                            u ? (i = o.style,
                                                typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none") : (s = h.stateNode,
                                                    a = h.memoizedProps.style,
                                                    l = a != null && a.hasOwnProperty("display") ? a.display : null,
                                                    s.style.display = Lc("display", l))
                                    } catch (S) {
                                        b(e, e.return, S)
                                    }
                                }
                            } else if (h.tag === 6) {
                                if (d === null)
                                    try {
                                        h.stateNode.nodeValue = u ? "" : h.memoizedProps
                                    } catch (S) {
                                        b(e, e.return, S)
                                    }
                            } else if ((h.tag !== 22 && h.tag !== 23 || h.memoizedState === null || h === e) && h.child !== null) {
                                h.child.return = h,
                                    h = h.child;
                                continue
                            }
                            if (h === e)
                                break e;
                            for (; h.sibling === null;) {
                                if (h.return === null || h.return === e)
                                    break e;
                                d === h && (d = null),
                                    h = h.return
                            }
                            d === h && (d = null),
                                h.sibling.return = h.return,
                                h = h.sibling
                        }
                    }
                    break;
                case 19:
                    Ye(t, e),
                        it(e),
                        r & 4 && fc(e);
                    break;
                case 21:
                    break;
                default:
                    Ye(t, e),
                        it(e)
            }
        }
        function it(e) {
            var t = e.flags;
            if (t & 2) {
                try {
                    e: {
                        for (var n = e.return; n !== null;) {
                            if (nf(n)) {
                                var r = n;
                                break e
                            }
                            n = n.return
                        }
                        throw Error(N(160))
                    }
                    switch (r.tag) {
                        case 5:
                            var o = r.stateNode;
                            r.flags & 32 && (Rr(o, ""),
                                r.flags &= -33);
                            var i = dc(e);
                            gs(e, i, o);
                            break;
                        case 3:
                        case 4:
                            var l = r.stateNode.containerInfo
                                , s = dc(e);
                            ys(e, s, l);
                            break;
                        default:
                            throw Error(N(161))
                    }
                } catch (a) {
                    b(e, e.return, a)
                }
                e.flags &= -3
            }
            t & 4096 && (e.flags &= -4097)
        }
        function Eh(e, t, n) {
            T = e,
                lf(e, t, n)
        }
        function lf(e, t, n) {
            for (var r = (e.mode & 1) !== 0; T !== null;) {
                var o = T
                    , i = o.child;
                if (o.tag === 22 && r) {
                    var l = o.memoizedState !== null || Fo;
                    if (!l) {
                        var s = o.alternate
                            , a = s !== null && s.memoizedState !== null || ve;
                        s = Fo;
                        var u = ve;
                        if (Fo = l,
                            (ve = a) && !u)
                            for (T = o; T !== null;)
                                l = T,
                                    a = l.child,
                                    l.tag === 22 && l.memoizedState !== null ? hc(o) : a !== null ? (a.return = l,
                                        T = a) : hc(o);
                        for (; i !== null;)
                            T = i,
                                lf(i, t, n),
                                i = i.sibling;
                        T = o,
                            Fo = s,
                            ve = u
                    }
                    pc(e, t, n)
                } else
                    (o.subtreeFlags & 8772) !== 0 && i !== null ? (i.return = o,
                        T = i) : pc(e, t, n)
            }
        }
        function pc(e) {
            for (; T !== null;) {
                var t = T;
                if ((t.flags & 8772) !== 0) {
                    var n = t.alternate;
                    try {
                        if ((t.flags & 8772) !== 0)
                            switch (t.tag) {
                                case 0:
                                case 11:
                                case 15:
                                    ve || Ci(5, t);
                                    break;
                                case 1:
                                    var r = t.stateNode;
                                    if (t.flags & 4 && !ve)
                                        if (n === null)
                                            r.componentDidMount();
                                        else {
                                            var o = t.elementType === t.type ? n.memoizedProps : Xe(t.type, n.memoizedProps);
                                            r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate)
                                        }
                                    var i = t.updateQueue;
                                    i !== null && Zu(t, i, r);
                                    break;
                                case 3:
                                    var l = t.updateQueue;
                                    if (l !== null) {
                                        if (n = null,
                                            t.child !== null)
                                            switch (t.child.tag) {
                                                case 5:
                                                    n = t.child.stateNode;
                                                    break;
                                                case 1:
                                                    n = t.child.stateNode
                                            }
                                        Zu(t, l, n)
                                    }
                                    break;
                                case 5:
                                    var s = t.stateNode;
                                    if (n === null && t.flags & 4) {
                                        n = s;
                                        var a = t.memoizedProps;
                                        switch (t.type) {
                                            case "button":
                                            case "input":
                                            case "select":
                                            case "textarea":
                                                a.autoFocus && n.focus();
                                                break;
                                            case "img":
                                                a.src && (n.src = a.src)
                                        }
                                    }
                                    break;
                                case 6:
                                    break;
                                case 4:
                                    break;
                                case 12:
                                    break;
                                case 13:
                                    if (t.memoizedState === null) {
                                        var u = t.alternate;
                                        if (u !== null) {
                                            var d = u.memoizedState;
                                            if (d !== null) {
                                                var h = d.dehydrated;
                                                h !== null && Or(h)
                                            }
                                        }
                                    }
                                    break;
                                case 19:
                                case 17:
                                case 21:
                                case 22:
                                case 23:
                                case 25:
                                    break;
                                default:
                                    throw Error(N(163))
                            }
                        ve || t.flags & 512 && vs(t)
                    } catch (m) {
                        b(t, t.return, m)
                    }
                }
                if (t === e) {
                    T = null;
                    break
                }
                if (n = t.sibling,
                    n !== null) {
                    n.return = t.return,
                        T = n;
                    break
                }
                T = t.return
            }
        }
        function mc(e) {
            for (; T !== null;) {
                var t = T;
                if (t === e) {
                    T = null;
                    break
                }
                var n = t.sibling;
                if (n !== null) {
                    n.return = t.return,
                        T = n;
                    break
                }
                T = t.return
            }
        }
        function hc(e) {
            for (; T !== null;) {
                var t = T;
                try {
                    switch (t.tag) {
                        case 0:
                        case 11:
                        case 15:
                            var n = t.return;
                            try {
                                Ci(4, t)
                            } catch (a) {
                                b(t, n, a)
                            }
                            break;
                        case 1:
                            var r = t.stateNode;
                            if (typeof r.componentDidMount == "function") {
                                var o = t.return;
                                try {
                                    r.componentDidMount()
                                } catch (a) {
                                    b(t, o, a)
                                }
                            }
                            var i = t.return;
                            try {
                                vs(t)
                            } catch (a) {
                                b(t, i, a)
                            }
                            break;
                        case 5:
                            var l = t.return;
                            try {
                                vs(t)
                            } catch (a) {
                                b(t, l, a)
                            }
                    }
                } catch (a) {
                    b(t, t.return, a)
                }
                if (t === e) {
                    T = null;
                    break
                }
                var s = t.sibling;
                if (s !== null) {
                    s.return = t.return,
                        T = s;
                    break
                }
                T = t.return
            }
        }
        var Ch = Math.ceil
            , di = Pt.ReactCurrentDispatcher
            , na = Pt.ReactCurrentOwner
            , Ve = Pt.ReactCurrentBatchConfig
            , W = 0
            , ae = null
            , ne = null
            , de = 0
            , ze = 0
            , Wn = Zt(0)
            , ie = 0
            , Gr = null
            , vn = 0
            , _i = 0
            , ra = 0
            , Mr = null
            , _e = null
            , oa = 0
            , Jn = 1 / 0
            , yt = null
            , fi = !1
            , ws = null
            , Qt = null
            , Do = !1
            , Wt = null
            , pi = 0
            , Lr = 0
            , ks = null
            , Ho = -1
            , $o = 0;
        function Ne() {
            return (W & 6) !== 0 ? te() : Ho !== -1 ? Ho : Ho = te()
        }
        function Kt(e) {
            return (e.mode & 1) === 0 ? 1 : (W & 2) !== 0 && de !== 0 ? de & -de : sh.transition !== null ? ($o === 0 && ($o = Hc()),
                $o) : (e = U,
                    e !== 0 || (e = window.event,
                        e = e === void 0 ? 16 : qc(e.type)),
                    e)
        }
        function be(e, t, n, r) {
            if (50 < Lr)
                throw Lr = 0,
                ks = null,
                Error(N(185));
            Yr(e, n, r),
                ((W & 2) === 0 || e !== ae) && (e === ae && ((W & 2) === 0 && (_i |= n),
                    ie === 4 && At(e, de)),
                    Me(e, r),
                    n === 1 && W === 0 && (t.mode & 1) === 0 && (Jn = te() + 500,
                        Si && Jt()))
        }
        function Me(e, t) {
            var n = e.callbackNode;
            um(e, t);
            var r = qo(e, e === ae ? de : 0);
            if (r === 0)
                n !== null && Eu(n),
                    e.callbackNode = null,
                    e.callbackPriority = 0;
            else if (t = r & -r,
                e.callbackPriority !== t) {
                if (n != null && Eu(n),
                    t === 1)
                    e.tag === 0 ? lh(vc.bind(null, e)) : hd(vc.bind(null, e)),
                        nh(function () {
                            (W & 6) === 0 && Jt()
                        }),
                        n = null;
                else {
                    switch ($c(r)) {
                        case 1:
                            n = Ls;
                            break;
                        case 4:
                            n = jc;
                            break;
                        case 16:
                            n = Xo;
                            break;
                        case 536870912:
                            n = Vc;
                            break;
                        default:
                            n = Xo
                    }
                    n = mf(n, sf.bind(null, e))
                }
                e.callbackPriority = t,
                    e.callbackNode = n
            }
        }
        function sf(e, t) {
            if (Ho = -1,
                $o = 0,
                (W & 6) !== 0)
                throw Error(N(327));
            var n = e.callbackNode;
            if (Qn() && e.callbackNode !== n)
                return null;
            var r = qo(e, e === ae ? de : 0);
            if (r === 0)
                return null;
            if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t)
                t = mi(e, r);
            else {
                t = r;
                var o = W;
                W |= 2;
                var i = uf();
                (ae !== e || de !== t) && (yt = null,
                    Jn = te() + 500,
                    dn(e, t));
                do
                    try {
                        xh();
                        break
                    } catch (s) {
                        af(e, s)
                    }
                while (!0);
                Hs(),
                    di.current = i,
                    W = o,
                    ne !== null ? t = 0 : (ae = null,
                        de = 0,
                        t = ie)
            }
            if (t !== 0) {
                if (t === 2 && (o = Gl(e),
                    o !== 0 && (r = o,
                        t = Ss(e, o))),
                    t === 1)
                    throw n = Gr,
                    dn(e, 0),
                    At(e, r),
                    Me(e, te()),
                    n;
                if (t === 6)
                    At(e, r);
                else {
                    if (o = e.current.alternate,
                        (r & 30) === 0 && !_h(o) && (t = mi(e, r),
                            t === 2 && (i = Gl(e),
                                i !== 0 && (r = i,
                                    t = Ss(e, i))),
                            t === 1))
                        throw n = Gr,
                        dn(e, 0),
                        At(e, r),
                        Me(e, te()),
                        n;
                    switch (e.finishedWork = o,
                    e.finishedLanes = r,
                    t) {
                        case 0:
                        case 1:
                            throw Error(N(345));
                        case 2:
                            sn(e, _e, yt);
                            break;
                        case 3:
                            if (At(e, r),
                                (r & 130023424) === r && (t = oa + 500 - te(),
                                    10 < t)) {
                                if (qo(e, 0) !== 0)
                                    break;
                                if (o = e.suspendedLanes,
                                    (o & r) !== r) {
                                    Ne(),
                                        e.pingedLanes |= e.suspendedLanes & o;
                                    break
                                }
                                e.timeoutHandle = ts(sn.bind(null, e, _e, yt), t);
                                break
                            }
                            sn(e, _e, yt);
                            break;
                        case 4:
                            if (At(e, r),
                                (r & 4194240) === r)
                                break;
                            for (t = e.eventTimes,
                                o = -1; 0 < r;) {
                                var l = 31 - Je(r);
                                i = 1 << l,
                                    l = t[l],
                                    l > o && (o = l),
                                    r &= ~i
                            }
                            if (r = o,
                                r = te() - r,
                                r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * Ch(r / 1960)) - r,
                                10 < r) {
                                e.timeoutHandle = ts(sn.bind(null, e, _e, yt), r);
                                break
                            }
                            sn(e, _e, yt);
                            break;
                        case 5:
                            sn(e, _e, yt);
                            break;
                        default:
                            throw Error(N(329))
                    }
                }
            }
            return Me(e, te()),
                e.callbackNode === n ? sf.bind(null, e) : null
        }
        function Ss(e, t) {
            var n = Mr;
            return e.current.memoizedState.isDehydrated && (dn(e, t).flags |= 256),
                e = mi(e, t),
                e !== 2 && (t = _e,
                    _e = n,
                    t !== null && Ns(t)),
                e
        }
        function Ns(e) {
            _e === null ? _e = e : _e.push.apply(_e, e)
        }
        function _h(e) {
            for (var t = e; ;) {
                if (t.flags & 16384) {
                    var n = t.updateQueue;
                    if (n !== null && (n = n.stores,
                        n !== null))
                        for (var r = 0; r < n.length; r++) {
                            var o = n[r]
                                , i = o.getSnapshot;
                            o = o.value;
                            try {
                                if (!et(i(), o))
                                    return !1
                            } catch {
                                return !1
                            }
                        }
                }
                if (n = t.child,
                    t.subtreeFlags & 16384 && n !== null)
                    n.return = t,
                        t = n;
                else {
                    if (t === e)
                        break;
                    for (; t.sibling === null;) {
                        if (t.return === null || t.return === e)
                            return !0;
                        t = t.return
                    }
                    t.sibling.return = t.return,
                        t = t.sibling
                }
            }
            return !0
        }
        function At(e, t) {
            for (t &= ~ra,
                t &= ~_i,
                e.suspendedLanes |= t,
                e.pingedLanes &= ~t,
                e = e.expirationTimes; 0 < t;) {
                var n = 31 - Je(t)
                    , r = 1 << n;
                e[n] = -1,
                    t &= ~r
            }
        }
        function vc(e) {
            if ((W & 6) !== 0)
                throw Error(N(327));
            Qn();
            var t = qo(e, 0);
            if ((t & 1) === 0)
                return Me(e, te()),
                    null;
            var n = mi(e, t);
            if (e.tag !== 0 && n === 2) {
                var r = Gl(e);
                r !== 0 && (t = r,
                    n = Ss(e, r))
            }
            if (n === 1)
                throw n = Gr,
                dn(e, 0),
                At(e, t),
                Me(e, te()),
                n;
            if (n === 6)
                throw Error(N(345));
            return e.finishedWork = e.current.alternate,
                e.finishedLanes = t,
                sn(e, _e, yt),
                Me(e, te()),
                null
        }
        function ia(e, t) {
            var n = W;
            W |= 1;
            try {
                return e(t)
            } finally {
                W = n,
                    W === 0 && (Jn = te() + 500,
                        Si && Jt())
            }
        }
        function yn(e) {
            Wt !== null && Wt.tag === 0 && (W & 6) === 0 && Qn();
            var t = W;
            W |= 1;
            var n = Ve.transition
                , r = U;
            try {
                if (Ve.transition = null,
                    U = 1,
                    e)
                    return e()
            } finally {
                U = r,
                    Ve.transition = n,
                    W = t,
                    (W & 6) === 0 && Jt()
            }
        }
        function la() {
            ze = Wn.current,
                K(Wn)
        }
        function dn(e, t) {
            e.finishedWork = null,
                e.finishedLanes = 0;
            var n = e.timeoutHandle;
            if (n !== -1 && (e.timeoutHandle = -1,
                th(n)),
                ne !== null)
                for (n = ne.return; n !== null;) {
                    var r = n;
                    switch (Us(r),
                    r.tag) {
                        case 1:
                            r = r.type.childContextTypes,
                                r != null && ti();
                            break;
                        case 3:
                            qn(),
                                K(xe),
                                K(ye),
                                Xs();
                            break;
                        case 5:
                            Ys(r);
                            break;
                        case 4:
                            qn();
                            break;
                        case 13:
                            K(X);
                            break;
                        case 19:
                            K(X);
                            break;
                        case 10:
                            $s(r.type._context);
                            break;
                        case 22:
                        case 23:
                            la()
                    }
                    n = n.return
                }
            if (ae = e,
                ne = e = Gt(e.current, null),
                de = ze = t,
                ie = 0,
                Gr = null,
                ra = _i = vn = 0,
                _e = Mr = null,
                un !== null) {
                for (t = 0; t < un.length; t++)
                    if (n = un[t],
                        r = n.interleaved,
                        r !== null) {
                        n.interleaved = null;
                        var o = r.next
                            , i = n.pending;
                        if (i !== null) {
                            var l = i.next;
                            i.next = o,
                                r.next = l
                        }
                        n.pending = r
                    }
                un = null
            }
            return e
        }
        function af(e, t) {
            do {
                var n = ne;
                try {
                    if (Hs(),
                        Uo.current = ci,
                        ui) {
                        for (var r = q.memoizedState; r !== null;) {
                            var o = r.queue;
                            o !== null && (o.pending = null),
                                r = r.next
                        }
                        ui = !1
                    }
                    if (hn = 0,
                        se = oe = q = null,
                        xr = !1,
                        $r = 0,
                        na.current = null,
                        n === null || n.return === null) {
                        ie = 1,
                            Gr = t,
                            ne = null;
                        break
                    }
                    e: {
                        var i = e
                            , l = n.return
                            , s = n
                            , a = t;
                        if (t = de,
                            s.flags |= 32768,
                            a !== null && typeof a == "object" && typeof a.then == "function") {
                            var u = a
                                , d = s
                                , h = d.tag;
                            if ((d.mode & 1) === 0 && (h === 0 || h === 11 || h === 15)) {
                                var m = d.alternate;
                                m ? (d.updateQueue = m.updateQueue,
                                    d.memoizedState = m.memoizedState,
                                    d.lanes = m.lanes) : (d.updateQueue = null,
                                        d.memoizedState = null)
                            }
                            var v = rc(l);
                            if (v !== null) {
                                v.flags &= -257,
                                    oc(v, l, s, i, t),
                                    v.mode & 1 && nc(i, u, t),
                                    t = v,
                                    a = u;
                                var y = t.updateQueue;
                                if (y === null) {
                                    var S = new Set;
                                    S.add(a),
                                        t.updateQueue = S
                                } else
                                    y.add(a);
                                break e
                            } else {
                                if ((t & 1) === 0) {
                                    nc(i, u, t),
                                        sa();
                                    break e
                                }
                                a = Error(N(426))
                            }
                        } else if (G && s.mode & 1) {
                            var L = rc(l);
                            if (L !== null) {
                                (L.flags & 65536) === 0 && (L.flags |= 256),
                                    oc(L, l, s, i, t),
                                    js(Zn(a, s));
                                break e
                            }
                        }
                        i = a = Zn(a, s),
                            ie !== 4 && (ie = 2),
                            Mr === null ? Mr = [i] : Mr.push(i),
                            i = l;
                        do {
                            switch (i.tag) {
                                case 3:
                                    i.flags |= 65536,
                                        t &= -t,
                                        i.lanes |= t;
                                    var f = $d(i, a, t);
                                    qu(i, f);
                                    break e;
                                case 1:
                                    s = a;
                                    var c = i.type
                                        , p = i.stateNode;
                                    if ((i.flags & 128) === 0 && (typeof c.getDerivedStateFromError == "function" || p !== null && typeof p.componentDidCatch == "function" && (Qt === null || !Qt.has(p)))) {
                                        i.flags |= 65536,
                                            t &= -t,
                                            i.lanes |= t;
                                        var g = Qd(i, s, t);
                                        qu(i, g);
                                        break e
                                    }
                            }
                            i = i.return
                        } while (i !== null)
                    }
                    df(n)
                } catch (P) {
                    t = P,
                        ne === n && n !== null && (ne = n = n.return);
                    continue
                }
                break
            } while (!0)
        }
        function uf() {
            var e = di.current;
            return di.current = ci,
                e === null ? ci : e
        }
        function sa() {
            (ie === 0 || ie === 3 || ie === 2) && (ie = 4),
                ae === null || (vn & 268435455) === 0 && (_i & 268435455) === 0 || At(ae, de)
        }
        function mi(e, t) {
            var n = W;
            W |= 2;
            var r = uf();
            (ae !== e || de !== t) && (yt = null,
                dn(e, t));
            do
                try {
                    Ph();
                    break
                } catch (o) {
                    af(e, o)
                }
            while (!0);
            if (Hs(),
                W = n,
                di.current = r,
                ne !== null)
                throw Error(N(261));
            return ae = null,
                de = 0,
                ie
        }
        function Ph() {
            for (; ne !== null;)
                cf(ne)
        }
        function xh() {
            for (; ne !== null && !em();)
                cf(ne)
        }
        function cf(e) {
            var t = pf(e.alternate, e, ze);
            e.memoizedProps = e.pendingProps,
                t === null ? df(e) : ne = t,
                na.current = null
        }
        function df(e) {
            var t = e;
            do {
                var n = t.alternate;
                if (e = t.return,
                    (t.flags & 32768) === 0) {
                    if (n = wh(n, t, ze),
                        n !== null) {
                        ne = n;
                        return
                    }
                } else {
                    if (n = kh(n, t),
                        n !== null) {
                        n.flags &= 32767,
                            ne = n;
                        return
                    }
                    if (e !== null)
                        e.flags |= 32768,
                            e.subtreeFlags = 0,
                            e.deletions = null;
                    else {
                        ie = 6,
                            ne = null;
                        return
                    }
                }
                if (t = t.sibling,
                    t !== null) {
                    ne = t;
                    return
                }
                ne = t = e
            } while (t !== null);
            ie === 0 && (ie = 5)
        }
        function sn(e, t, n) {
            var r = U
                , o = Ve.transition;
            try {
                Ve.transition = null,
                    U = 1,
                    Th(e, t, n, r)
            } finally {
                Ve.transition = o,
                    U = r
            }
            return null
        }
        function Th(e, t, n, r) {
            do
                Qn();
            while (Wt !== null);
            if ((W & 6) !== 0)
                throw Error(N(327));
            n = e.finishedWork;
            var o = e.finishedLanes;
            if (n === null)
                return null;
            if (e.finishedWork = null,
                e.finishedLanes = 0,
                n === e.current)
                throw Error(N(177));
            e.callbackNode = null,
                e.callbackPriority = 0;
            var i = n.lanes | n.childLanes;
            if (cm(e, i),
                e === ae && (ne = ae = null,
                    de = 0),
                (n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0 || Do || (Do = !0,
                    mf(Xo, function () {
                        return Qn(),
                            null
                    })),
                i = (n.flags & 15990) !== 0,
                (n.subtreeFlags & 15990) !== 0 || i) {
                i = Ve.transition,
                    Ve.transition = null;
                var l = U;
                U = 1;
                var s = W;
                W |= 4,
                    na.current = null,
                    Nh(e, n),
                    of(n, e),
                    qm(bl),
                    Zo = !!Jl,
                    bl = Jl = null,
                    e.current = n,
                    Eh(n, e, o),
                    tm(),
                    W = s,
                    U = l,
                    Ve.transition = i
            } else
                e.current = n;
            if (Do && (Do = !1,
                Wt = e,
                pi = o),
                i = e.pendingLanes,
                i === 0 && (Qt = null),
                om(n.stateNode, r),
                Me(e, te()),
                t !== null)
                for (r = e.onRecoverableError,
                    n = 0; n < t.length; n++)
                    o = t[n],
                        r(o.value, {
                            componentStack: o.stack,
                            digest: o.digest
                        });
            if (fi)
                throw fi = !1,
                e = ws,
                ws = null,
                e;
            return (pi & 1) !== 0 && e.tag !== 0 && Qn(),
                i = e.pendingLanes,
                (i & 1) !== 0 ? e === ks ? Lr++ : (Lr = 0,
                    ks = e) : Lr = 0,
                Jt(),
                null
        }
        function Qn() {
            if (Wt !== null) {
                var e = $c(pi)
                    , t = Ve.transition
                    , n = U;
                try {
                    if (Ve.transition = null,
                        U = 16 > e ? 16 : e,
                        Wt === null)
                        var r = !1;
                    else {
                        if (e = Wt,
                            Wt = null,
                            pi = 0,
                            (W & 6) !== 0)
                            throw Error(N(331));
                        var o = W;
                        for (W |= 4,
                            T = e.current; T !== null;) {
                            var i = T
                                , l = i.child;
                            if ((T.flags & 16) !== 0) {
                                var s = i.deletions;
                                if (s !== null) {
                                    for (var a = 0; a < s.length; a++) {
                                        var u = s[a];
                                        for (T = u; T !== null;) {
                                            var d = T;
                                            switch (d.tag) {
                                                case 0:
                                                case 11:
                                                case 15:
                                                    Tr(8, d, i)
                                            }
                                            var h = d.child;
                                            if (h !== null)
                                                h.return = d,
                                                    T = h;
                                            else
                                                for (; T !== null;) {
                                                    d = T;
                                                    var m = d.sibling
                                                        , v = d.return;
                                                    if (tf(d),
                                                        d === u) {
                                                        T = null;
                                                        break
                                                    }
                                                    if (m !== null) {
                                                        m.return = v,
                                                            T = m;
                                                        break
                                                    }
                                                    T = v
                                                }
                                        }
                                    }
                                    var y = i.alternate;
                                    if (y !== null) {
                                        var S = y.child;
                                        if (S !== null) {
                                            y.child = null;
                                            do {
                                                var L = S.sibling;
                                                S.sibling = null,
                                                    S = L
                                            } while (S !== null)
                                        }
                                    }
                                    T = i
                                }
                            }
                            if ((i.subtreeFlags & 2064) !== 0 && l !== null)
                                l.return = i,
                                    T = l;
                            else
                                e: for (; T !== null;) {
                                    if (i = T,
                                        (i.flags & 2048) !== 0)
                                        switch (i.tag) {
                                            case 0:
                                            case 11:
                                            case 15:
                                                Tr(9, i, i.return)
                                        }
                                    var f = i.sibling;
                                    if (f !== null) {
                                        f.return = i.return,
                                            T = f;
                                        break e
                                    }
                                    T = i.return
                                }
                        }
                        var c = e.current;
                        for (T = c; T !== null;) {
                            l = T;
                            var p = l.child;
                            if ((l.subtreeFlags & 2064) !== 0 && p !== null)
                                p.return = l,
                                    T = p;
                            else
                                e: for (l = c; T !== null;) {
                                    if (s = T,
                                        (s.flags & 2048) !== 0)
                                        try {
                                            switch (s.tag) {
                                                case 0:
                                                case 11:
                                                case 15:
                                                    Ci(9, s)
                                            }
                                        } catch (P) {
                                            b(s, s.return, P)
                                        }
                                    if (s === l) {
                                        T = null;
                                        break e
                                    }
                                    var g = s.sibling;
                                    if (g !== null) {
                                        g.return = s.return,
                                            T = g;
                                        break e
                                    }
                                    T = s.return
                                }
                        }
                        if (W = o,
                            Jt(),
                            at && typeof at.onPostCommitFiberRoot == "function")
                            try {
                                at.onPostCommitFiberRoot(vi, e)
                            } catch { }
                        r = !0
                    }
                    return r
                } finally {
                    U = n,
                        Ve.transition = t
                }
            }
            return !1
        }
        function yc(e, t, n) {
            t = Zn(n, t),
                t = $d(e, t, 1),
                e = $t(e, t, 1),
                t = Ne(),
                e !== null && (Yr(e, 1, t),
                    Me(e, t))
        }
        function b(e, t, n) {
            if (e.tag === 3)
                yc(e, e, n);
            else
                for (; t !== null;) {
                    if (t.tag === 3) {
                        yc(t, e, n);
                        break
                    } else if (t.tag === 1) {
                        var r = t.stateNode;
                        if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Qt === null || !Qt.has(r))) {
                            e = Zn(n, e),
                                e = Qd(t, e, 1),
                                t = $t(t, e, 1),
                                e = Ne(),
                                t !== null && (Yr(t, 1, e),
                                    Me(t, e));
                            break
                        }
                    }
                    t = t.return
                }
        }
        function Mh(e, t, n) {
            var r = e.pingCache;
            r !== null && r.delete(t),
                t = Ne(),
                e.pingedLanes |= e.suspendedLanes & n,
                ae === e && (de & n) === n && (ie === 4 || ie === 3 && (de & 130023424) === de && 500 > te() - oa ? dn(e, 0) : ra |= n),
                Me(e, t)
        }
        function ff(e, t) {
            t === 0 && ((e.mode & 1) === 0 ? t = 1 : (t = So,
                So <<= 1,
                (So & 130023424) === 0 && (So = 4194304)));
            var n = Ne();
            e = Ct(e, t),
                e !== null && (Yr(e, t, n),
                    Me(e, n))
        }
        function Lh(e) {
            var t = e.memoizedState
                , n = 0;
            t !== null && (n = t.retryLane),
                ff(e, n)
        }
        function zh(e, t) {
            var n = 0;
            switch (e.tag) {
                case 13:
                    var r = e.stateNode
                        , o = e.memoizedState;
                    o !== null && (n = o.retryLane);
                    break;
                case 19:
                    r = e.stateNode;
                    break;
                default:
                    throw Error(N(314))
            }
            r !== null && r.delete(t),
                ff(e, n)
        }
        var pf;
        pf = function (e, t, n) {
            if (e !== null)
                if (e.memoizedProps !== t.pendingProps || xe.current)
                    Pe = !0;
                else {
                    if ((e.lanes & n) === 0 && (t.flags & 128) === 0)
                        return Pe = !1,
                            gh(e, t, n);
                    Pe = (e.flags & 131072) !== 0
                }
            else
                Pe = !1,
                    G && (t.flags & 1048576) !== 0 && vd(t, oi, t.index);
            switch (t.lanes = 0,
            t.tag) {
                case 2:
                    var r = t.type;
                    Vo(e, t),
                        e = t.pendingProps;
                    var o = Gn(t, ye.current);
                    $n(t, n),
                        o = Zs(null, t, r, e, o, n);
                    var i = Js();
                    return t.flags |= 1,
                        typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1,
                            t.memoizedState = null,
                            t.updateQueue = null,
                            Te(r) ? (i = !0,
                                ni(t)) : i = !1,
                            t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null,
                            Ks(t),
                            o.updater = Ei,
                            t.stateNode = o,
                            o._reactInternals = t,
                            as(t, r, e, n),
                            t = ds(null, t, r, !0, i, n)) : (t.tag = 0,
                                G && i && Ws(t),
                                Se(null, t, o, n),
                                t = t.child),
                        t;
                case 16:
                    r = t.elementType;
                    e: {
                        switch (Vo(e, t),
                        e = t.pendingProps,
                        o = r._init,
                        r = o(r._payload),
                        t.type = r,
                        o = t.tag = Ih(r),
                        e = Xe(r, e),
                        o) {
                            case 0:
                                t = cs(null, t, r, e, n);
                                break e;
                            case 1:
                                t = sc(null, t, r, e, n);
                                break e;
                            case 11:
                                t = ic(null, t, r, e, n);
                                break e;
                            case 14:
                                t = lc(null, t, r, Xe(r.type, e), n);
                                break e
                        }
                        throw Error(N(306, r, ""))
                    }
                    return t;
                case 0:
                    return r = t.type,
                        o = t.pendingProps,
                        o = t.elementType === r ? o : Xe(r, o),
                        cs(e, t, r, o, n);
                case 1:
                    return r = t.type,
                        o = t.pendingProps,
                        o = t.elementType === r ? o : Xe(r, o),
                        sc(e, t, r, o, n);
                case 3:
                    e: {
                        if (Xd(t),
                            e === null)
                            throw Error(N(387));
                        r = t.pendingProps,
                            i = t.memoizedState,
                            o = i.element,
                            Nd(e, t),
                            si(t, r, null, n);
                        var l = t.memoizedState;
                        if (r = l.element,
                            i.isDehydrated)
                            if (i = {
                                element: r,
                                isDehydrated: !1,
                                cache: l.cache,
                                pendingSuspenseBoundaries: l.pendingSuspenseBoundaries,
                                transitions: l.transitions
                            },
                                t.updateQueue.baseState = i,
                                t.memoizedState = i,
                                t.flags & 256) {
                                o = Zn(Error(N(423)), t),
                                    t = ac(e, t, r, n, o);
                                break e
                            } else if (r !== o) {
                                o = Zn(Error(N(424)), t),
                                    t = ac(e, t, r, n, o);
                                break e
                            } else
                                for (Re = Ht(t.stateNode.containerInfo.firstChild),
                                    Ie = t,
                                    G = !0,
                                    Ze = null,
                                    n = kd(t, null, r, n),
                                    t.child = n; n;)
                                    n.flags = n.flags & -3 | 4096,
                                        n = n.sibling;
                        else {
                            if (Yn(),
                                r === o) {
                                t = _t(e, t, n);
                                break e
                            }
                            Se(e, t, r, n)
                        }
                        t = t.child
                    }
                    return t;
                case 5:
                    return Ed(t),
                        e === null && is(t),
                        r = t.type,
                        o = t.pendingProps,
                        i = e !== null ? e.memoizedProps : null,
                        l = o.children,
                        es(r, o) ? l = null : i !== null && es(r, i) && (t.flags |= 32),
                        Yd(e, t),
                        Se(e, t, l, n),
                        t.child;
                case 6:
                    return e === null && is(t),
                        null;
                case 13:
                    return qd(e, t, n);
                case 4:
                    return Gs(t, t.stateNode.containerInfo),
                        r = t.pendingProps,
                        e === null ? t.child = Xn(t, null, r, n) : Se(e, t, r, n),
                        t.child;
                case 11:
                    return r = t.type,
                        o = t.pendingProps,
                        o = t.elementType === r ? o : Xe(r, o),
                        ic(e, t, r, o, n);
                case 7:
                    return Se(e, t, t.pendingProps, n),
                        t.child;
                case 8:
                    return Se(e, t, t.pendingProps.children, n),
                        t.child;
                case 12:
                    return Se(e, t, t.pendingProps.children, n),
                        t.child;
                case 10:
                    e: {
                        if (r = t.type._context,
                            o = t.pendingProps,
                            i = t.memoizedProps,
                            l = o.value,
                            $(ii, r._currentValue),
                            r._currentValue = l,
                            i !== null)
                            if (et(i.value, l)) {
                                if (i.children === o.children && !xe.current) {
                                    t = _t(e, t, n);
                                    break e
                                }
                            } else
                                for (i = t.child,
                                    i !== null && (i.return = t); i !== null;) {
                                    var s = i.dependencies;
                                    if (s !== null) {
                                        l = i.child;
                                        for (var a = s.firstContext; a !== null;) {
                                            if (a.context === r) {
                                                if (i.tag === 1) {
                                                    a = St(-1, n & -n),
                                                        a.tag = 2;
                                                    var u = i.updateQueue;
                                                    if (u !== null) {
                                                        u = u.shared;
                                                        var d = u.pending;
                                                        d === null ? a.next = a : (a.next = d.next,
                                                            d.next = a),
                                                            u.pending = a
                                                    }
                                                }
                                                i.lanes |= n,
                                                    a = i.alternate,
                                                    a !== null && (a.lanes |= n),
                                                    ls(i.return, n, t),
                                                    s.lanes |= n;
                                                break
                                            }
                                            a = a.next
                                        }
                                    } else if (i.tag === 10)
                                        l = i.type === t.type ? null : i.child;
                                    else if (i.tag === 18) {
                                        if (l = i.return,
                                            l === null)
                                            throw Error(N(341));
                                        l.lanes |= n,
                                            s = l.alternate,
                                            s !== null && (s.lanes |= n),
                                            ls(l, n, t),
                                            l = i.sibling
                                    } else
                                        l = i.child;
                                    if (l !== null)
                                        l.return = i;
                                    else
                                        for (l = i; l !== null;) {
                                            if (l === t) {
                                                l = null;
                                                break
                                            }
                                            if (i = l.sibling,
                                                i !== null) {
                                                i.return = l.return,
                                                    l = i;
                                                break
                                            }
                                            l = l.return
                                        }
                                    i = l
                                }
                        Se(e, t, o.children, n),
                            t = t.child
                    }
                    return t;
                case 9:
                    return o = t.type,
                        r = t.pendingProps.children,
                        $n(t, n),
                        o = He(o),
                        r = r(o),
                        t.flags |= 1,
                        Se(e, t, r, n),
                        t.child;
                case 14:
                    return r = t.type,
                        o = Xe(r, t.pendingProps),
                        o = Xe(r.type, o),
                        lc(e, t, r, o, n);
                case 15:
                    return Kd(e, t, t.type, t.pendingProps, n);
                case 17:
                    return r = t.type,
                        o = t.pendingProps,
                        o = t.elementType === r ? o : Xe(r, o),
                        Vo(e, t),
                        t.tag = 1,
                        Te(r) ? (e = !0,
                            ni(t)) : e = !1,
                        $n(t, n),
                        Hd(t, r, o),
                        as(t, r, o, n),
                        ds(null, t, r, !0, e, n);
                case 19:
                    return Zd(e, t, n);
                case 22:
                    return Gd(e, t, n)
            }
            throw Error(N(156, t.tag))
        }
            ;
        function mf(e, t) {
            return Uc(e, t)
        }
        function Rh(e, t, n, r) {
            this.tag = e,
                this.key = n,
                this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null,
                this.index = 0,
                this.ref = null,
                this.pendingProps = t,
                this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null,
                this.mode = r,
                this.subtreeFlags = this.flags = 0,
                this.deletions = null,
                this.childLanes = this.lanes = 0,
                this.alternate = null
        }
        function je(e, t, n, r) {
            return new Rh(e, t, n, r)
        }
        function aa(e) {
            return e = e.prototype,
                !(!e || !e.isReactComponent)
        }
        function Ih(e) {
            if (typeof e == "function")
                return aa(e) ? 1 : 0;
            if (e != null) {
                if (e = e.$$typeof,
                    e === xs)
                    return 11;
                if (e === Ts)
                    return 14
            }
            return 2
        }
        function Gt(e, t) {
            var n = e.alternate;
            return n === null ? (n = je(e.tag, t, e.key, e.mode),
                n.elementType = e.elementType,
                n.type = e.type,
                n.stateNode = e.stateNode,
                n.alternate = e,
                e.alternate = n) : (n.pendingProps = t,
                    n.type = e.type,
                    n.flags = 0,
                    n.subtreeFlags = 0,
                    n.deletions = null),
                n.flags = e.flags & 14680064,
                n.childLanes = e.childLanes,
                n.lanes = e.lanes,
                n.child = e.child,
                n.memoizedProps = e.memoizedProps,
                n.memoizedState = e.memoizedState,
                n.updateQueue = e.updateQueue,
                t = e.dependencies,
                n.dependencies = t === null ? null : {
                    lanes: t.lanes,
                    firstContext: t.firstContext
                },
                n.sibling = e.sibling,
                n.index = e.index,
                n.ref = e.ref,
                n
        }
        function Qo(e, t, n, r, o, i) {
            var l = 2;
            if (r = e,
                typeof e == "function")
                aa(e) && (l = 1);
            else if (typeof e == "string")
                l = 5;
            else
                e: switch (e) {
                    case Mn:
                        return fn(n.children, o, i, t);
                    case Ps:
                        l = 8,
                            o |= 8;
                        break;
                    case Rl:
                        return e = je(12, n, t, o | 2),
                            e.elementType = Rl,
                            e.lanes = i,
                            e;
                    case Il:
                        return e = je(13, n, t, o),
                            e.elementType = Il,
                            e.lanes = i,
                            e;
                    case Fl:
                        return e = je(19, n, t, o),
                            e.elementType = Fl,
                            e.lanes = i,
                            e;
                    case Ec:
                        return Pi(n, o, i, t);
                    default:
                        if (typeof e == "object" && e !== null)
                            switch (e.$$typeof) {
                                case Sc:
                                    l = 10;
                                    break e;
                                case Nc:
                                    l = 9;
                                    break e;
                                case xs:
                                    l = 11;
                                    break e;
                                case Ts:
                                    l = 14;
                                    break e;
                                case Ft:
                                    l = 16,
                                        r = null;
                                    break e
                            }
                        throw Error(N(130, e == null ? e : typeof e, ""))
                }
            return t = je(l, n, t, o),
                t.elementType = e,
                t.type = r,
                t.lanes = i,
                t
        }
        function fn(e, t, n, r) {
            return e = je(7, e, r, t),
                e.lanes = n,
                e
        }
        function Pi(e, t, n, r) {
            return e = je(22, e, r, t),
                e.elementType = Ec,
                e.lanes = n,
                e.stateNode = {
                    isHidden: !1
                },
                e
        }
        function Ml(e, t, n) {
            return e = je(6, e, null, t),
                e.lanes = n,
                e
        }
        function Ll(e, t, n) {
            return t = je(4, e.children !== null ? e.children : [], e.key, t),
                t.lanes = n,
                t.stateNode = {
                    containerInfo: e.containerInfo,
                    pendingChildren: null,
                    implementation: e.implementation
                },
                t
        }
        function Fh(e, t, n, r, o) {
            this.tag = t,
                this.containerInfo = e,
                this.finishedWork = this.pingCache = this.current = this.pendingChildren = null,
                this.timeoutHandle = -1,
                this.callbackNode = this.pendingContext = this.context = null,
                this.callbackPriority = 0,
                this.eventTimes = pl(0),
                this.expirationTimes = pl(-1),
                this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0,
                this.entanglements = pl(0),
                this.identifierPrefix = r,
                this.onRecoverableError = o,
                this.mutableSourceEagerHydrationData = null
        }
        function ua(e, t, n, r, o, i, l, s, a) {
            return e = new Fh(e, t, n, s, a),
                t === 1 ? (t = 1,
                    i === !0 && (t |= 8)) : t = 0,
                i = je(3, null, null, t),
                e.current = i,
                i.stateNode = e,
                i.memoizedState = {
                    element: r,
                    isDehydrated: n,
                    cache: null,
                    transitions: null,
                    pendingSuspenseBoundaries: null
                },
                Ks(i),
                e
        }
        function Dh(e, t, n) {
            var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
            return {
                $$typeof: Tn,
                key: r == null ? null : "" + r,
                children: e,
                containerInfo: t,
                implementation: n
            }
        }
        function hf(e) {
            if (!e)
                return Xt;
            e = e._reactInternals;
            e: {
                if (wn(e) !== e || e.tag !== 1)
                    throw Error(N(170));
                var t = e;
                do {
                    switch (t.tag) {
                        case 3:
                            t = t.stateNode.context;
                            break e;
                        case 1:
                            if (Te(t.type)) {
                                t = t.stateNode.__reactInternalMemoizedMergedChildContext;
                                break e
                            }
                    }
                    t = t.return
                } while (t !== null);
                throw Error(N(171))
            }
            if (e.tag === 1) {
                var n = e.type;
                if (Te(n))
                    return md(e, n, t)
            }
            return t
        }
        function vf(e, t, n, r, o, i, l, s, a) {
            return e = ua(n, r, !0, e, o, i, l, s, a),
                e.context = hf(null),
                n = e.current,
                r = Ne(),
                o = Kt(n),
                i = St(r, o),
                i.callback = t ?? null,
                $t(n, i, o),
                e.current.lanes = o,
                Yr(e, o, r),
                Me(e, r),
                e
        }
        function xi(e, t, n, r) {
            var o = t.current
                , i = Ne()
                , l = Kt(o);
            return n = hf(n),
                t.context === null ? t.context = n : t.pendingContext = n,
                t = St(i, l),
                t.payload = {
                    element: e
                },
                r = r === void 0 ? null : r,
                r !== null && (t.callback = r),
                e = $t(o, t, l),
                e !== null && (be(e, o, l, i),
                    Wo(e, o, l)),
                l
        }
        function hi(e) {
            if (e = e.current,
                !e.child)
                return null;
            switch (e.child.tag) {
                case 5:
                    return e.child.stateNode;
                default:
                    return e.child.stateNode
            }
        }
        function gc(e, t) {
            if (e = e.memoizedState,
                e !== null && e.dehydrated !== null) {
                var n = e.retryLane;
                e.retryLane = n !== 0 && n < t ? n : t
            }
        }
        function ca(e, t) {
            gc(e, t),
                (e = e.alternate) && gc(e, t)
        }
        function Oh() {
            return null
        }
        var yf = typeof reportError == "function" ? reportError : function (e) {
            console.error(e)
        }
            ;
        function da(e) {
            this._internalRoot = e
        }
        Ti.prototype.render = da.prototype.render = function (e) {
            var t = this._internalRoot;
            if (t === null)
                throw Error(N(409));
            xi(e, t, null, null)
        }
            ;
        Ti.prototype.unmount = da.prototype.unmount = function () {
            var e = this._internalRoot;
            if (e !== null) {
                this._internalRoot = null;
                var t = e.containerInfo;
                yn(function () {
                    xi(null, e, null, null)
                }),
                    t[Et] = null
            }
        }
            ;
        function Ti(e) {
            this._internalRoot = e
        }
        Ti.prototype.unstable_scheduleHydration = function (e) {
            if (e) {
                var t = Gc();
                e = {
                    blockedOn: null,
                    target: e,
                    priority: t
                };
                for (var n = 0; n < Ot.length && t !== 0 && t < Ot[n].priority; n++)
                    ;
                Ot.splice(n, 0, e),
                    n === 0 && Xc(e)
            }
        }
            ;
        function fa(e) {
            return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11)
        }
        function Mi(e) {
            return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
        }
        function wc() { }
        function Ah(e, t, n, r, o) {
            if (o) {
                if (typeof r == "function") {
                    var i = r;
                    r = function () {
                        var u = hi(l);
                        i.call(u)
                    }
                }
                var l = vf(t, r, e, 0, null, !1, !1, "", wc);
                return e._reactRootContainer = l,
                    e[Et] = l.current,
                    Wr(e.nodeType === 8 ? e.parentNode : e),
                    yn(),
                    l
            }
            for (; o = e.lastChild;)
                e.removeChild(o);
            if (typeof r == "function") {
                var s = r;
                r = function () {
                    var u = hi(a);
                    s.call(u)
                }
            }
            var a = ua(e, 0, !1, null, null, !1, !1, "", wc);
            return e._reactRootContainer = a,
                e[Et] = a.current,
                Wr(e.nodeType === 8 ? e.parentNode : e),
                yn(function () {
                    xi(t, a, n, r)
                }),
                a
        }
        function Li(e, t, n, r, o) {
            var i = n._reactRootContainer;
            if (i) {
                var l = i;
                if (typeof o == "function") {
                    var s = o;
                    o = function () {
                        var a = hi(l);
                        s.call(a)
                    }
                }
                xi(t, l, e, o)
            } else
                l = Ah(n, t, e, o, r);
            return hi(l)
        }
        Qc = function (e) {
            switch (e.tag) {
                case 3:
                    var t = e.stateNode;
                    if (t.current.memoizedState.isDehydrated) {
                        var n = kr(t.pendingLanes);
                        n !== 0 && (zs(t, n | 1),
                            Me(t, te()),
                            (W & 6) === 0 && (Jn = te() + 500,
                                Jt()))
                    }
                    break;
                case 13:
                    yn(function () {
                        var r = Ct(e, 1);
                        if (r !== null) {
                            var o = Ne();
                            be(r, e, 1, o)
                        }
                    }),
                        ca(e, 1)
            }
        }
            ;
        Rs = function (e) {
            if (e.tag === 13) {
                var t = Ct(e, 134217728);
                if (t !== null) {
                    var n = Ne();
                    be(t, e, 134217728, n)
                }
                ca(e, 134217728)
            }
        }
            ;
        Kc = function (e) {
            if (e.tag === 13) {
                var t = Kt(e)
                    , n = Ct(e, t);
                if (n !== null) {
                    var r = Ne();
                    be(n, e, t, r)
                }
                ca(e, t)
            }
        }
            ;
        Gc = function () {
            return U
        }
            ;
        Yc = function (e, t) {
            var n = U;
            try {
                return U = e,
                    t()
            } finally {
                U = n
            }
        }
            ;
        $l = function (e, t, n) {
            switch (t) {
                case "input":
                    if (Al(e, n),
                        t = n.name,
                        n.type === "radio" && t != null) {
                        for (n = e; n.parentNode;)
                            n = n.parentNode;
                        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'),
                            t = 0; t < n.length; t++) {
                            var r = n[t];
                            if (r !== e && r.form === e.form) {
                                var o = ki(r);
                                if (!o)
                                    throw Error(N(90));
                                _c(r),
                                    Al(r, o)
                            }
                        }
                    }
                    break;
                case "textarea":
                    xc(e, n);
                    break;
                case "select":
                    t = n.value,
                        t != null && Un(e, !!n.multiple, t, !1)
            }
        }
            ;
        Fc = ia;
        Dc = yn;
        var Bh = {
            usingClientEntryPoint: !1,
            Events: [qr, In, ki, Rc, Ic, ia]
        }
            , vr = {
                findFiberByHostInstance: an,
                bundleType: 0,
                version: "18.3.1",
                rendererPackageName: "react-dom"
            }
            , Wh = {
                bundleType: vr.bundleType,
                version: vr.version,
                rendererPackageName: vr.rendererPackageName,
                rendererConfig: vr.rendererConfig,
                overrideHookState: null,
                overrideHookStateDeletePath: null,
                overrideHookStateRenamePath: null,
                overrideProps: null,
                overridePropsDeletePath: null,
                overridePropsRenamePath: null,
                setErrorHandler: null,
                setSuspenseHandler: null,
                scheduleUpdate: null,
                currentDispatcherRef: Pt.ReactCurrentDispatcher,
                findHostInstanceByFiber: function (e) {
                    return e = Bc(e),
                        e === null ? null : e.stateNode
                },
                findFiberByHostInstance: vr.findFiberByHostInstance || Oh,
                findHostInstancesForRefresh: null,
                scheduleRefresh: null,
                scheduleRoot: null,
                setRefreshHandler: null,
                getCurrentFiber: null,
                reconcilerVersion: "18.3.1-next-f1338f8080-20240426"
            };
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && (yr = __REACT_DEVTOOLS_GLOBAL_HOOK__,
            !yr.isDisabled && yr.supportsFiber))
            try {
                vi = yr.inject(Wh),
                    at = yr
            } catch { }
        var yr;
        Oe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Bh;
        Oe.createPortal = function (e, t) {
            var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
            if (!fa(t))
                throw Error(N(200));
            return Dh(e, t, null, n)
        }
            ;
        Oe.createRoot = function (e, t) {
            if (!fa(e))
                throw Error(N(299));
            var n = !1
                , r = ""
                , o = yf;
            return t != null && (t.unstable_strictMode === !0 && (n = !0),
                t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
                t.onRecoverableError !== void 0 && (o = t.onRecoverableError)),
                t = ua(e, 1, !1, null, null, n, !1, r, o),
                e[Et] = t.current,
                Wr(e.nodeType === 8 ? e.parentNode : e),
                new da(t)
        }
            ;
        Oe.findDOMNode = function (e) {
            if (e == null)
                return null;
            if (e.nodeType === 1)
                return e;
            var t = e._reactInternals;
            if (t === void 0)
                throw typeof e.render == "function" ? Error(N(188)) : (e = Object.keys(e).join(","),
                    Error(N(268, e)));
            return e = Bc(t),
                e = e === null ? null : e.stateNode,
                e
        }
            ;
        Oe.flushSync = function (e) {
            return yn(e)
        }
            ;
        Oe.hydrate = function (e, t, n) {
            if (!Mi(t))
                throw Error(N(200));
            return Li(null, e, t, !0, n)
        }
            ;
        Oe.hydrateRoot = function (e, t, n) {
            if (!fa(e))
                throw Error(N(405));
            var r = n != null && n.hydratedSources || null
                , o = !1
                , i = ""
                , l = yf;
            if (n != null && (n.unstable_strictMode === !0 && (o = !0),
                n.identifierPrefix !== void 0 && (i = n.identifierPrefix),
                n.onRecoverableError !== void 0 && (l = n.onRecoverableError)),
                t = vf(t, null, e, 1, n ?? null, o, !1, i, l),
                e[Et] = t.current,
                Wr(e),
                r)
                for (e = 0; e < r.length; e++)
                    n = r[e],
                        o = n._getVersion,
                        o = o(n._source),
                        t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(n, o);
            return new Ti(t)
        }
            ;
        Oe.render = function (e, t, n) {
            if (!Mi(t))
                throw Error(N(200));
            return Li(null, e, t, !1, n)
        }
            ;
        Oe.unmountComponentAtNode = function (e) {
            if (!Mi(e))
                throw Error(N(40));
            return e._reactRootContainer ? (yn(function () {
                Li(null, null, e, !1, function () {
                    e._reactRootContainer = null,
                        e[Et] = null
                })
            }),
                !0) : !1
        }
            ;
        Oe.unstable_batchedUpdates = ia;
        Oe.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
            if (!Mi(n))
                throw Error(N(200));
            if (e == null || e._reactInternals === void 0)
                throw Error(N(38));
            return Li(e, t, n, !1, r)
        }
            ;
        Oe.version = "18.3.1-next-f1338f8080-20240426"
    }
    );
    var Sf = vt((pv, kf) => {
        "use strict";
        function wf() {
            if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
                try {
                    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(wf)
                } catch (e) {
                    console.error(e)
                }
        }
        wf(),
            kf.exports = gf()
    }
    );
    var Ef = vt(pa => {
        "use strict";
        var Nf = Sf();
        pa.createRoot = Nf.createRoot,
            pa.hydrateRoot = Nf.hydrateRoot;
        var mv
    }
    );
    var Ff = vt(Oi => {
        "use strict";
        var s0 = ee()
            , a0 = Symbol.for("react.element")
            , u0 = Symbol.for("react.fragment")
            , c0 = Object.prototype.hasOwnProperty
            , d0 = s0.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
            , f0 = {
                key: !0,
                ref: !0,
                __self: !0,
                __source: !0
            };
        function If(e, t, n) {
            var r, o = {}, i = null, l = null;
            n !== void 0 && (i = "" + n),
                t.key !== void 0 && (i = "" + t.key),
                t.ref !== void 0 && (l = t.ref);
            for (r in t)
                c0.call(t, r) && !f0.hasOwnProperty(r) && (o[r] = t[r]);
            if (e && e.defaultProps)
                for (r in t = e.defaultProps,
                    t)
                    o[r] === void 0 && (o[r] = t[r]);
            return {
                $$typeof: a0,
                type: e,
                key: i,
                ref: l,
                props: o,
                _owner: d0.current
            }
        }
        Oi.Fragment = u0;
        Oi.jsx = If;
        Oi.jsxs = If
    }
    );
    var A = vt((Nv, Df) => {
        "use strict";
        Df.exports = Ff()
    }
    );
    var Xy = R(ee())
        , mp = R(Ef());
    var zt = R(ee());
    var we = R(ee());
    var ma = "#000000"
        , ha = "#FFFFFF"
        , Uh = "#F4F6F8";
    var zi = (e, t = 0, n = 1) => Math.max(t, Math.min(n, e));
    function nr(e) {
        let t = e.replace("#", "");
        return [0, 2, 4].map(n => parseInt(t.slice(n, n + 2), 16))
    }
    function tr([e, t, n]) {
        return "#" + [e, t, n].map(r => Math.round(zi(r, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase()
    }
    function xt(e, t) {
        let [n, r, o] = nr(e);
        return `rgba(${n},${r},${o},${t})`
    }
    function jh(e, t, n) {
        if (n === 0)
            return [t, t, t];
        let r = t <= .5 ? t * (1 + n) : t + n - t * n
            , o = 2 * t - r
            , i = l => (l = (l % 1 + 1) % 1,
                l < 1 / 6 ? o + (r - o) * l * 6 : l < .5 ? r : l < 2 / 3 ? o + (r - o) * (2 / 3 - l) * 6 : o);
        return [i(e + 1 / 3), i(e), i(e - 1 / 3)]
    }
    var Cf = (e, t, n) => tr(jh(e, t, n).map(r => r * 255));
    function Ri(e, t = .314) {
        if (e = zi(e),
            e <= .06)
            return ma;
        if (e >= .94)
            return Uh;
        let n = (e - .06) / (.94 - .06);
        return Cf(n, .12 + zi(t) * (.82 - .12), .7)
    }
    function ya(e) {
        return e = zi(e),
            e <= .06 ? "#000000" : e <= .14 ? ha : Cf((e - .14) / (1 - .14), .78, 1)
    }
    function va(e) {
        let t = nr(e).map(n => (n /= 255,
            n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4));
        return t[0] * .2126 + t[1] * .7152 + t[2] * .0722
    }
    var ct = e => va(e) >= .35;
    function Vh(e, t) {
        let [n, r] = [va(e), va(t)].sort((o, i) => i - o);
        return (n + .05) / (r + .05)
    }
    function ga(e, t) {
        if (Vh(e, t) >= 1.8)
            return e.toUpperCase();
        let n = nr(e);
        return ct(t) ? tr(n.map(r => r * .31)) : tr(n.map(r => r + (255 - r) * .6))
    }
    function Hh(e, t = 115) {
        let [n, r, o] = nr(e).map(L => L / 255)
            , i = Math.max(n, r, o)
            , l = Math.min(n, r, o)
            , s = i - l
            , a = 0;
        s && (i === n ? a = (r - o) / s % 6 : i === r ? a = (o - n) / s + 2 : a = (n - r) / s + 4,
            a /= 6);
        let u = i ? s / i : 0
            , d = i * 100 / t
            , h = Math.floor(a * 6)
            , m = a * 6 - h
            , v = d * (1 - u)
            , y = d * (1 - m * u)
            , S = d * (1 - (1 - m) * u);
        return [n, r, o] = [[d, S, v], [y, d, v], [v, d, S], [v, y, d], [S, v, d], [d, v, y]][(h % 6 + 6) % 6],
            tr([n * 255, r * 255, o * 255])
    }
    function Ii(e = ha, t = ma) {
        let n = e.toUpperCase() === ha && t.toUpperCase() === ma
            , r = ga(e, t);
        return {
            ink: n ? "#F6F7F9" : r,
            eye: n ? "#FFFFFF" : r,
            shade: n ? "#DEE6F2" : Hh(r, 115),
            glow: n ? "#E1EBFF" : r,
            text: ct(t) ? "#1C232D" : "#F4F6F8",
            dim: ct(t) ? "#424E5E" : "rgba(148,163,184,0.8)"
        }
    }
    var Ce = (e, t = 0, n = 1) => Math.max(t, Math.min(n, e))
        , xf = {
            open_l: 1,
            open_r: 1,
            shut_l: 0,
            shut_r: 0,
            eye_size: 1,
            squint: 0,
            look_x: 0,
            look_y: 0,
            brow_tilt: 0,
            glow: .3,
            stretch: 0,
            dots: 0,
            zzz: 0
        }
        , wa = Object.keys(xf)
        , Jr = Object.fromEntries(Object.entries({
            idle: {
                glow: .3
            },
            hover: {
                eye_size: 1.06,
                glow: .55
            },
            listening: {
                eye_size: 1.08,
                look_y: -.1,
                glow: .5
            },
            thinking: {
                look_x: .65,
                look_y: -.85,
                brow_tilt: -.15,
                squint: .12,
                dots: 1,
                glow: .35
            },
            concentrate: {
                eye_size: 1.04,
                look_x: -.1,
                look_y: -.5,
                glow: .4
            },
            talking: {
                glow: .45
            },
            happy: {
                squint: .7,
                glow: .8
            },
            wink: {
                shut_l: 1,
                glow: .5
            },
            nervous: {
                eye_size: 1.02,
                look_x: .15,
                look_y: .45,
                brow_tilt: .9,
                glow: .3
            },
            sad: {
                open_l: .84,
                open_r: .84,
                look_y: .4,
                brow_tilt: .95,
                glow: .15
            },
            meh: {
                open_l: .5,
                open_r: .5,
                look_x: -.4,
                look_y: .15,
                glow: .15
            },
            surprised: {
                eye_size: 1.15,
                glow: .6
            },
            sleepy: {
                open_l: 0,
                open_r: 0,
                zzz: 1,
                glow: .05
            }
        }).map(([e, t]) => [e, {
            ...xf,
            ...t
        }]))
        , $h = {
            look_x: [300, .6],
            look_y: [300, .6],
            brow_tilt: [150, .6],
            eye_size: [180, .6],
            glow: [120, .85],
            stretch: [320, .45],
            dots: [60, 1],
            zzz: [40, 1]
        }
        , Qh = [220, .75]
        , _f = new Set(["idle", "hover", "talking", "listening"])
        , Kh = new Set(["idle", "hover"])
        , Pf = .15
        , Gh = 1 / 60
        , Yh = .5
        , Xh = .62
        , qh = .82
        , Zh = 2;
    function Jh(e) {
        let t = e >>> 0;
        return () => {
            t |= 0,
                t = t + 1831565813 | 0;
            let n = Math.imul(t ^ t >>> 15, 1 | t);
            return n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n,
                ((n ^ n >>> 14) >>> 0) / 4294967296
        }
    }
    var bt = class {
        constructor({ seed: t = Math.floor(Math.random() * 1e9), animated: n = !0 } = {}) {
            this.animated = n,
                this.random = Jh(t),
                this.uniform = (r, o) => r + (o - r) * this.random(),
                this.name = "idle",
                this.val = {
                    ...Jr.idle
                },
                this.vel = Object.fromEntries(wa.map(r => [r, 0])),
                this.clock = 0,
                this.blinkAt = this.uniform(1.5, 4),
                this.blinkT = -1,
                this.doubleBlink = !1,
                this.glance = [0, 0],
                this.glanceAt = 0,
                this.jitter = [0, 0],
                this.jitterAt = 0,
                this.hop = 0,
                this.hopV = 0,
                this.hopAt = this.uniform(5, 10),
                this.setPalette()
        }
        setPalette(t, n) {
            this.palette = Ii(t, n)
        }
        settle(t = "idle") {
            this.name = Jr[t] ? t : "idle",
                this.val = {
                    ...Jr[this.name]
                },
                wa.forEach(n => {
                    this.vel[n] = 0
                }
                ),
                this.blinkT = -1,
                this.hop = this.hopV = 0
        }
        poke() {
            this.animated && (this.blinkT = 0,
                this.doubleBlink = !1,
                this.hopV += .9)
        }
        target(t, n, r) {
            let o = {
                ...Jr[t]
            };
            if (r ? (o.look_x = r[0],
                o.look_y = r[1]) : this.animated && _f.has(t) && (this.clock >= this.glanceAt && (this.glance = [this.uniform(-.85, .85), this.uniform(-.8, .35)],
                    this.glanceAt = this.clock + this.uniform(.6, 2.2)),
                    o.look_x += this.glance[0] * .8,
                    o.look_y += this.glance[1] * .8),
                this.animated) {
                if (this.clock >= this.jitterAt) {
                    let i = t === "talking" ? .06 : t === "thinking" ? .04 : .02;
                    this.jitter = [this.uniform(-i, i), this.uniform(-i, i)],
                        this.jitterAt = this.clock + this.uniform(.5, 1.4)
                }
                t === "thinking" && (o.look_x += .08 * Math.sin(this.clock * 1.3)),
                    o.look_x += this.jitter[0],
                    o.look_y += this.jitter[1]
            }
            if (t === "listening") {
                let i = Ce(n);
                o.eye_size += .05 * i,
                    o.stretch = .2 * i,
                    o.glow += .45 * i
            }
            if (t === "talking" && this.animated) {
                let i = .5 + .5 * Math.sin(this.clock * 15) * Math.sin(this.clock * 4.1 + 1);
                o.glow += .2 * i
            }
            return o
        }
        advance(t, n = "idle", r = 0, o = null) {
            if (t = Ce(t, 0, .25),
                Jr[n] || (n = "idle"),
                n !== this.name && this.animated && (this.blinkT = 0,
                    this.doubleBlink = !1,
                    ["sleepy", "meh", "sad"].includes(n) || (this.hopV += 1.1)),
                this.name = n,
                !this.animated) {
                this.val = this.target(n, r, o),
                    this.clock += t;
                return
            }
            let i = t;
            for (; i > 1e-6;) {
                let l = Math.min(Gh, i);
                i -= l,
                    this.clock += l;
                let s = this.target(n, r, o);
                for (let a of wa) {
                    let [u, d] = $h[a] || Qh
                        , h = 2 * Math.sqrt(u) * d;
                    this.vel[a] += (u * (s[a] - this.val[a]) - h * this.vel[a]) * l,
                        this.val[a] += this.vel[a] * l
                }
                Kh.has(n) && this.clock >= this.hopAt && (this.hopV += this.uniform(.8, 1.3),
                    this.hopAt = this.clock + this.uniform(7, 14)),
                    this.hopV += (-260 * this.hop - 2 * Math.sqrt(260) * .35 * this.hopV) * l,
                    this.hop += this.hopV * l,
                    this.stepBlink(l, n)
            }
        }
        stepBlink(t, n) {
            this.blinkT >= 0 ? (this.blinkT += t,
                this.blinkT > Pf && (this.doubleBlink ? (this.doubleBlink = !1,
                    this.blinkT = 0) : (this.blinkT = -1,
                        this.blinkAt = this.clock + this.uniform(2, 5)))) : _f.has(n) && this.clock >= this.blinkAt && (this.blinkT = 0,
                            this.doubleBlink = this.random() < .25)
        }
        blink() {
            return this.blinkT < 0 ? 1 : 1 - Math.sin(Math.PI * Math.min(1, this.blinkT / Pf))
        }
        layout(t, n, r, o) {
            let i = this.val
                , l = o
                , s = this.animated ? Math.sin(this.clock * 1.8) * l * .012 : 0
                , a = Ce(this.hop, -.12, .12) * l
                , u = Ce(i.look_x, -1, 1)
                , d = Ce(i.look_y, -1, 1)
                , h = t + r / 2 + u * l * .12
                , m = n + o / 2 - a + s + d * l * .05
                , v = m - l * .04
                , y = l * .19 * i.eye_size * Yh
                , S = l * .25 * i.eye_size * Xh * (1 + Math.max(0, i.stretch))
                , L = l * .43 * qh
                , f = this.blink();
            return {
                d: l,
                cx: h,
                cy: m,
                eyeCy: v,
                eyeDx: L,
                rx: y,
                ry: S,
                gx: u,
                gy: d,
                blink: f,
                line: Math.max(1.1, l * .05),
                openness: Ce(Math.min(i.open_l, i.open_r) * f * (1 - Math.max(i.shut_l, i.shut_r))),
                eye: (c, p = !0) => [h + c * L + (p ? u * y * .95 : 0), v + (p ? d * S * .5 : 0)]
            }
        }
        paint(t, n, r, o, i) {
            let l = this.val;
            if (i < 8 || o < 8)
                return;
            let s = this.palette
                , { d: a, cx: u, eyeCy: d, eyeDx: h, rx: m, ry: v, gx: y, gy: S, blink: L, line: f } = this.layout(n, r, o, i);
            if (l.glow > .01 && L > .3)
                for (let c of [-1, 1]) {
                    let p = u + c * h + y * m * .55
                        , g = d + S * v * .3
                        , P = Math.max(m, v) * 2.2
                        , _ = Math.min(.75, .3 * Zh * Ce(l.glow, 0, 1.6)) * L
                        , w = t.createRadialGradient(p, g, 0, p, g, P);
                    w.addColorStop(0, xt(s.glow, _)),
                        w.addColorStop(.45, xt(s.glow, _ * .35)),
                        w.addColorStop(1, xt(s.glow, 0)),
                        t.fillStyle = w,
                        t.beginPath(),
                        t.arc(p, g, P, 0, Math.PI * 2),
                        t.fill()
                }
            for (let [c, p, g] of [[-1, l.open_l, l.shut_l], [1, l.open_r, l.shut_r]])
                this.paintEye(t, u + c * h, d, m, v, p * L, g, l, c, f, y, S);
            l.dots > .02 && this.paintDots(t, u + h + m + a * .12, d - v * .5, a, l.dots),
                l.zzz > .02 && this.paintZzz(t, u + h + m * .3, d - v * .2, a, l.zzz)
        }
        paintEye(t, n, r, o, i, l, s, a, u, d, h, m) {
            let v = this.palette
                , y = n + h * o * .95
                , S = r + m * i * .5
                , L = o * 2
                , f = 1 - Ce(s);
            if (f > .01) {
                t.save(),
                    t.globalAlpha *= f,
                    t.translate(y, S),
                    t.rotate(-u * Ce(a.brow_tilt, -1, 1) * 10 * Math.PI / 180);
                let c = i * 2 * Ce(l);
                if (l > .12) {
                    let p = Ce(a.squint);
                    p > .02 && (t.beginPath(),
                        t.moveTo(-L, -c),
                        t.lineTo(L, -c),
                        t.lineTo(L, c / 2 + 2),
                        t.quadraticCurveTo(0, c / 2 + 2 - p * c * 1.25, -L, c / 2 + 2),
                        t.closePath(),
                        t.clip());
                    let g = t.createLinearGradient(0, -c / 2, 0, c / 2);
                    g.addColorStop(0, v.eye),
                        g.addColorStop(.6, v.eye),
                        g.addColorStop(1, v.shade),
                        t.fillStyle = g,
                        t.beginPath(),
                        t.roundRect(-L / 2, -c / 2, L, c, L / 2),
                        t.fill()
                } else
                    t.strokeStyle = v.ink,
                        t.lineWidth = d * 1.2,
                        t.lineCap = "round",
                        t.beginPath(),
                        t.moveTo(-L / 2, 0),
                        t.quadraticCurveTo(0, i * .45, L / 2, 0),
                        t.stroke();
                t.restore()
            }
            s > .01 && (t.save(),
                t.globalAlpha *= Ce(s),
                t.strokeStyle = v.ink,
                t.lineWidth = d * 1.2,
                t.lineCap = "round",
                t.beginPath(),
                t.moveTo(y - L / 2, S + i * .2),
                t.quadraticCurveTo(y, S - i * .85, y + L / 2, S + i * .2),
                t.stroke(),
                t.restore())
        }
        paintDots(t, n, r, o, i) {
            for (let l = 0; l < 3; l++) {
                let s = this.animated ? Math.sin(this.clock * 3 + l) * o * .03 : 0;
                t.fillStyle = xt(this.palette.ink, Ce(i) * (1 - l * .28)),
                    t.beginPath(),
                    t.arc(n + l * o * .13, r - l * o * .1 + s, o * (.045 + l * .012), 0, Math.PI * 2),
                    t.fill()
            }
        }
        paintZzz(t, n, r, o, i) {
            t.save(),
                t.lineCap = "round",
                t.lineJoin = "round",
                t.lineWidth = Math.max(1, o * .035);
            for (let l = 0; l < 3; l++) {
                let s = this.animated ? (this.clock * .35 + l / 3) % 1 : l / 3
                    , a = o * (.1 + l * .03)
                    , u = n + s * o * .35 + Math.sin(s * 6) * o * .03
                    , d = r - s * o * .45;
                t.strokeStyle = xt(this.palette.ink, Ce(i) * .9 * Math.sin(Math.PI * s)),
                    t.beginPath(),
                    t.moveTo(u, d),
                    t.lineTo(u + a, d),
                    t.lineTo(u, d + a),
                    t.lineTo(u + a, d + a),
                    t.stroke()
            }
            t.restore()
        }
    }
        ;
    function dt(e) {
        let t = .55 + .45 * Math.sin(e * 11) * Math.sin(e * 3.7 + 1);
        return Ce(t * (.75 + .25 * Math.sin(e * 1.9)))
    }
    var Sn = R(ee())
        , le = typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        , Tf = typeof window < "u" ? new URLSearchParams(window.location.search) : new URLSearchParams
        , tt = Tf.has("at")
        , rr = Number(Tf.get("at")) || 0
        , Fi = new Set
        , br = 0
        , ka = !1;
    function Mf(e) {
        let t = br ? Math.min(.1, (e - br) / 1e3) : .016666666666666666;
        br = e,
            Fi.forEach(n => n(t, e / 1e3)),
            Fi.size ? requestAnimationFrame(Mf) : (ka = !1,
                br = 0)
    }
    function ft(e, t = !0) {
        let n = (0,
            Sn.useRef)(e);
        n.current = e,
            (0,
                Sn.useEffect)(() => {
                    if (!t)
                        return;
                    let r = (o, i) => n.current(o, i);
                    return Fi.add(r),
                        ka || (ka = !0,
                            br = 0,
                            requestAnimationFrame(Mf)),
                        () => {
                            Fi.delete(r)
                        }
                }
                    , [t])
    }
    var kn = {
        x: -1e5,
        y: -1e5,
        moved: !1
    };
    typeof window < "u" && (window.addEventListener("pointermove", e => {
        kn.x = e.clientX,
            kn.y = e.clientY,
            kn.moved = !0
    }
        , {
            passive: !0
        }),
        window.addEventListener("pointerleave", () => {
            kn.moved = !1
        }
        ));
    function Di(e) {
        if (!kn.moved || !e)
            return null;
        let t = e.getBoundingClientRect()
            , n = kn.x - (t.left + t.width / 2)
            , r = kn.y - (t.top + t.height / 2);
        return Math.hypot(n, r) > 1100 ? null : [Math.max(-1, Math.min(1, n / 380)), Math.max(-1, Math.min(1, r / 220))]
    }
    function pt(e, t = "120px") {
        let [n, r] = (0,
            Sn.useState)(!1);
        return (0,
            Sn.useEffect)(() => {
                let o = e.current;
                if (!o || typeof IntersectionObserver > "u") {
                    r(!0);
                    return
                }
                let i = new IntersectionObserver(([l]) => r(l.isIntersecting), {
                    rootMargin: t
                });
                return i.observe(o),
                    () => i.disconnect()
            }
                , [e, t]),
            n
    }
    var Tt = R(ee());
    var Lf = "#FF5C8A"
        , bh = "#FFB3C8"
        , Sa = "#E9EBF0"
        , Na = "#AEB3BF"
        , e0 = (e, t = 0, n = 1) => Math.max(t, Math.min(n, e));
    function zf(e, t, n, r) {
        let o = r / 2;
        e.beginPath(),
            e.moveTo(t, n + o * .95),
            e.bezierCurveTo(t - o * 1.25, n + o * .15, t - o * 1.05, n - o * 1.05, t, n - o * .4),
            e.bezierCurveTo(t + o * 1.05, n - o * 1.05, t + o * 1.25, n + o * .15, t, n + o * .95),
            e.closePath()
    }
    function t0(e, t, n, r) {
        let o = 1 + Math.sin(n * 9) * .06;
        for (let i of [-1, 1]) {
            let [l, s] = t.eye(i)
                , a = t.rx * 3.1 * o
                , u = e.createLinearGradient(l, s - a / 2, l, s + a / 2);
            u.addColorStop(0, bh),
                u.addColorStop(.62, Lf),
                u.addColorStop(1, "#E94478"),
                e.shadowColor = "rgba(255,92,138,0.55)",
                e.shadowBlur = t.d * .12,
                e.fillStyle = u,
                zf(e, l, s, a),
                e.fill(),
                e.shadowBlur = 0
        }
        if (r) {
            for (let i = 0; i < 3; i++) {
                let l = (n * .72 + i / 3) % 1
                    , s = i % 2 ? 1 : -1
                    , a = t.cx + s * t.eyeDx * 1.34 + Math.sin(n * 3 + i) * t.d * .06
                    , u = t.eyeCy - t.ry * .5 - l * t.d * .5;
                e.globalAlpha = Math.sin(Math.PI * l) * .8,
                    e.fillStyle = Lf,
                    zf(e, a, u, t.d * .17),
                    e.fill()
            }
            e.globalAlpha = 1
        }
    }
    function n0(e, t) {
        let n = t.rx * 4.1
            , r = t.ry * 2.45
            , o = "rgba(245,248,255,0.68)"
            , i = [-1, 1].map(l => t.eye(l, !1));
        for (let l = 0; l < i.length; l++) {
            let [s, a] = i[l]
                , u = s - n / 2
                , d = a - r / 2
                , h = e.createLinearGradient(0, d, 0, d + r);
            h.addColorStop(0, "#343A49"),
                h.addColorStop(1, "#11141B"),
                e.beginPath(),
                e.roundRect(u, d, n, r, r * .28),
                e.fillStyle = h,
                e.fill(),
                e.strokeStyle = o,
                e.lineWidth = Math.max(.8, t.line * .38),
                e.stroke();
            let [m, v] = t.eye(l ? 1 : -1);
            e.save(),
                e.beginPath(),
                e.roundRect(u, d, n, r, r * .28),
                e.clip(),
                e.fillStyle = "rgba(255,255,255,0.28)",
                e.beginPath(),
                e.ellipse(m, v, t.rx * 1.25, t.ry * .7, 0, 0, Math.PI * 2),
                e.fill(),
                e.restore(),
                e.strokeStyle = "rgba(255,255,255,0.6)",
                e.lineWidth = Math.max(.7, t.line * .3),
                e.beginPath(),
                e.moveTo(u + n * .18, d + r * .25),
                e.lineTo(u + n * .36, d + r * .11),
                e.stroke()
        }
        e.strokeStyle = o,
            e.lineWidth = Math.max(.8, t.line * .48),
            e.beginPath(),
            e.moveTo(i[0][0] + n / 2, i[0][1] - r * .18),
            e.quadraticCurveTo(t.cx, i[0][1] - r * .48, i[1][0] - n / 2, i[1][1] - r * .18),
            e.stroke()
    }
    function r0(e, t) {
        let n = Math.max(t.rx, t.ry) * 1.42
            , r = [-1, 1].map(o => t.eye(o, !1));
        e.strokeStyle = "rgba(245,248,255,0.88)",
            e.lineWidth = Math.max(.8, t.line * .48),
            e.beginPath();
        for (let [o, i] of r)
            e.moveTo(o + n, i),
                e.arc(o, i, n, 0, Math.PI * 2);
        e.stroke(),
            e.beginPath(),
            e.moveTo(r[0][0] + n, r[0][1] - n * .15),
            e.quadraticCurveTo(t.cx, r[0][1] - n * .55, r[1][0] - n, r[1][1] - n * .15),
            e.moveTo(r[0][0] - n, r[0][1] - n * .18),
            e.lineTo(r[0][0] - n * 1.32, r[0][1] - n * .34),
            e.moveTo(r[1][0] + n, r[1][1] - n * .18),
            e.lineTo(r[1][0] + n * 1.32, r[1][1] - n * .34),
            e.stroke()
    }
    function o0(e, t, n) {
        let r = t.d
            , o = t.eyeDx + t.rx + r * .24
            , i = t.eyeCy + r * .02
            , l = r * .17
            , s = r * .36
            , a = t.eyeCy - r * .4;
        e.beginPath(),
            e.moveTo(t.cx - o, i - s * .3),
            e.bezierCurveTo(t.cx - o, a, t.cx + o, a, t.cx + o, i - s * .3),
            e.lineCap = "round",
            e.strokeStyle = Na,
            e.lineWidth = r * .075,
            e.stroke(),
            e.strokeStyle = Sa,
            e.lineWidth = r * .045,
            e.stroke();
        for (let u of [-1, 1]) {
            let d = t.cx + u * o
                , h = e.createLinearGradient(d - l / 2, 0, d + l / 2, 0);
            h.addColorStop(0, u < 0 ? Sa : Na),
                h.addColorStop(1, u < 0 ? Na : Sa),
                e.fillStyle = h,
                e.beginPath(),
                e.roundRect(d - l / 2, i - s / 2, l, s, l * .45),
                e.fill(),
                e.fillStyle = "rgba(56,130,246," + (.72 + .28 * e0(n)) + ")",
                e.beginPath(),
                e.roundRect(d + u * l * .07, i - s * .28, l * .22, s * .56, l * .1),
                e.fill()
        }
    }
    function i0(e, t) {
        let n = t.cx + t.eyeDx + t.rx + t.d * .14
            , r = t.eyeCy - t.ry - t.d * .03
            , o = t.d * .11;
        e.save(),
            e.translate(n, r),
            e.rotate(18 * Math.PI / 180);
        let i = e.createLinearGradient(0, -o, 0, o);
        i.addColorStop(0, "#FF9CC5"),
            i.addColorStop(1, "#FF6FA8"),
            e.fillStyle = i;
        for (let l of [-1, 1])
            e.beginPath(),
                e.moveTo(0, 0),
                e.bezierCurveTo(l * o * .6, -o * 1.2, l * o * 1.5, -o * .9, l * o * 1.35, 0),
                e.bezierCurveTo(l * o * 1.5, o * .9, l * o * .6, o * 1.2, 0, 0),
                e.fill();
        e.fillStyle = "#E0457F",
            e.beginPath(),
            e.ellipse(0, 0, o * .32, o * .36, 0, 0, Math.PI * 2),
            e.fill(),
            e.restore()
    }
    function l0(e, t, n, r) {
        if (!n)
            return;
        let o = t.cx + t.eyeDx + t.rx + t.d * .3
            , i = t.eyeCy - Math.sin(r * 2) * t.d * .04
            , l = t.d * .28
            , a = {
                charging: "#FFD60A",
                download: "#0A84FF",
                screenshot: "#F8FAFF",
                timer: "#FF9F0A"
            }[n];
        if (a) {
            if (e.save(),
                e.shadowColor = a,
                e.shadowBlur = l * .55,
                e.fillStyle = a,
                n === "charging")
                e.beginPath(),
                    e.moveTo(o + l * .12, i - l * .55),
                    e.lineTo(o - l * .42, i + l * .08),
                    e.lineTo(o - l * .02, i + l * .08),
                    e.lineTo(o - l * .16, i + l * .55),
                    e.lineTo(o + l * .46, i - l * .14),
                    e.lineTo(o + l * .04, i - l * .14),
                    e.closePath(),
                    e.fill();
            else if (n === "download")
                e.beginPath(),
                    e.arc(o, i, l * .5, 0, Math.PI * 2),
                    e.fill(),
                    e.shadowBlur = 0,
                    e.strokeStyle = "#fff",
                    e.lineWidth = Math.max(.8, l * .12),
                    e.beginPath(),
                    e.moveTo(o, i - l * .23),
                    e.lineTo(o, i + l * .16),
                    e.moveTo(o - l * .16, i + l * .02),
                    e.lineTo(o, i + l * .18),
                    e.lineTo(o + l * .16, i + l * .02),
                    e.stroke();
            else if (n === "timer")
                e.beginPath(),
                    e.moveTo(o - l * .42, i + l * .35),
                    e.quadraticCurveTo(o - l * .24, i + l * .08, o - l * .27, i - l * .2),
                    e.quadraticCurveTo(o, i - l * .66, o + l * .27, i - l * .2),
                    e.quadraticCurveTo(o + l * .24, i + l * .08, o + l * .42, i + l * .35),
                    e.closePath(),
                    e.fill(),
                    e.beginPath(),
                    e.arc(o, i + l * .47, l * .1, 0, Math.PI * 2),
                    e.fill();
            else {
                e.shadowBlur = 0,
                    e.lineWidth = Math.max(.8, l * .1),
                    e.strokeStyle = a;
                let u = l * .42
                    , d = l * .16;
                for (let h of [-1, 1])
                    for (let m of [-1, 1])
                        e.beginPath(),
                            e.moveTo(o + h * u, i + m * (u - d)),
                            e.lineTo(o + h * u, i + m * u),
                            e.lineTo(o + h * (u - d), i + m * u),
                            e.stroke();
                e.beginPath(),
                    e.arc(o, i, l * .1, 0, Math.PI * 2),
                    e.fill()
            }
            e.restore()
        }
    }
    function Rf(e, t, n, r, o, i, l = {}) {
        let { outfit: s = "none", love: a = !1, badge: u = null, groove: d = 0, time: h = 0 } = l;
        if (!(a || u || d > .01 || ["headphones", "shades", "glasses", "bow"].includes(s))) {
            t.paint(e, n, r, o, i);
            return
        }
        let v = t.layout(n, r, o, i);
        if (e.save(),
            d > .01 && t.animated) {
            let y = h * Math.PI * 2 * 1.9;
            e.translate(v.cx, v.cy - Math.abs(Math.sin(y)) * i * .07 * d),
                e.rotate(Math.sin(y) * 7 * d * Math.PI / 180),
                e.translate(-v.cx, -v.cy)
        }
        t.paint(e, n, r, o, i),
            s === "shades" && n0(e, v),
            s === "glasses" && r0(e, v),
            (s === "headphones" || d > .01) && o0(e, v, d),
            s === "bow" && i0(e, v),
            a && t0(e, v, h, t.animated),
            l0(e, v, u, h),
            e.restore()
    }
    var Ea = R(A())
        , Of = 104
        , p0 = 54
        , Ai = {
            x: 10,
            y: 5,
            w: 84,
            h: 45
        };
    function eo(e, t, n) {
        let r = Math.min(3, window.devicePixelRatio || 1)
            , o = Math.round(t * r)
            , i = Math.round(n * r);
        (e.width !== o || e.height !== i) && (e.width = o,
            e.height = i);
        let l = e.getContext("2d");
        return l.setTransform(r, 0, 0, r, 0, 0),
            l.clearRect(0, 0, t, n),
            l
    }
    function m0(e, t, n, r, o, i, l = o / 2) {
        let s = ct(i);
        e.beginPath(),
            e.roundRect(t + .5, n + .5, r - 1, o - 1, l),
            e.fillStyle = i,
            e.fill(),
            e.lineWidth = 1,
            e.strokeStyle = s ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.12)",
            e.stroke();
        let a = t + l * .55
            , u = t + r - l * .55;
        if (u - a > 4) {
            let d = e.createLinearGradient(a, 0, u, 0);
            d.addColorStop(0, "rgba(255,255,255,0)"),
                d.addColorStop(.5, s ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)"),
                d.addColorStop(1, "rgba(255,255,255,0)"),
                e.strokeStyle = d,
                e.beginPath(),
                e.moveTo(a, n + 1.5),
                e.lineTo(u, n + 1.5),
                e.stroke()
        }
    }
    function ge({ width: e = 104, pill: t = "#000000", eyes: n = "#FFFFFF", script: r, follow: o = !0, seed: i, className: l = "", label: s = "Nixi", onPoke: a, face: u, active: d = !0, shadow: h = !0 }) {
        let m = (0,
            Tt.useRef)(null)
            , v = (0,
                Tt.useRef)(null)
            , y = (0,
                Tt.useMemo)(() => u || new bt({
                    seed: i,
                    animated: !le
                }), [u, i])
            , S = pt(v)
            , L = (0,
                Tt.useRef)(0)
            , f = e * p0 / Of;
        (0,
            Tt.useEffect)(() => {
                y.setPalette(n, t)
            }
                , [y, n, t]);
        let c = (g = r ? r(L.current) : {}) => {
            let P = m.current;
            if (!P)
                return;
            let _ = eo(P, e, f)
                , w = e / Of;
            m0(_, 0, 0, e, f, t),
                Rf(_, y, Ai.x * w, Ai.y * w, Ai.w * w, Ai.h * w, {
                    outfit: g.outfit || "none",
                    love: !!g.love,
                    badge: g.badge || null,
                    groove: g.groove || 0,
                    time: L.current
                })
        }
            ;
        ft(g => {
            L.current += g;
            let P = r ? r(L.current) : {}
                , _ = P.look !== void 0 ? P.look : o ? Di(m.current) : null;
            y.advance(g, P.mood || "idle", P.level || 0, _),
                c(P)
        }
            , S && d && !le && !tt),
            (0,
                Tt.useEffect)(() => {
                    (le || tt || !S) && (y.settle(r && r(2).mood || "idle"),
                        c(r ? r(2) : {}))
                }
                );
        let p = () => {
            y.poke(),
                a && a()
        }
            ;
        return (0,
            Ea.jsx)("span", {
                ref: v,
                className: "pill " + (h ? "pill-shadow " : "") + l,
                style: {
                    width: e,
                    height: f
                },
                children: (0,
                    Ea.jsx)("canvas", {
                        ref: m,
                        role: "img",
                        "aria-label": s,
                        style: {
                            width: e,
                            height: f
                        },
                        onClick: p
                    })
            })
    }
    var B = R(A())
        , h0 = {
            rest: [104, 54],
            capsule: [340, 88],
            dictation: [120, 88]
        }
        , Bf = 54
        , Ca = 330
        , v0 = .74
        , Wf = "#3B82F6"
        , _a = "#F59E0B"
        , Pa = "#22C55E";
    function y0(e) {
        let t = Math.max(1, Math.ceil((e || "").length / 44));
        return Bf + 6 + t * 24 + 14
    }
    function g0(e, t, n, r, o, i, l) {
        if (e.clearRect(0, 0, t, n),
            r === "done") {
            e.strokeStyle = Pa,
                e.lineWidth = 2.4,
                e.lineCap = "round",
                e.lineJoin = "round",
                e.beginPath(),
                e.moveTo(t * .22, n * .52),
                e.lineTo(t * .42, n * .72),
                e.lineTo(t * .78, n * .3),
                e.stroke();
            return
        }
        let s = 4;
        for (let a = 0; a < s; a++) {
            let u;
            r === "think" ? u = .35 + .35 * (1 + Math.sin(i * 6 - a * .9)) / 2 : r === "listen" ? u = .25 + .75 * o * (.6 + .4 * Math.sin(i * 9 + a * 1.7)) : u = .22;
            let d = Math.max(3, u * n * .8);
            e.fillStyle = r === "think" ? _a : r === "listen" ? Wf : l,
                e.beginPath(),
                e.roundRect(3 + a * 5, (n - d) / 2, 3, d, 1.5),
                e.fill()
        }
    }
    var Af = {
        pointer: (0,
            B.jsx)("svg", {
                viewBox: "0 0 24 24",
                children: (0,
                    B.jsx)("path", {
                        d: "M6 3.5v15.2l4-4.2 2.8 5.6 2.4-1.1-2.7-5.5 5.8-.4L6 3.5Z"
                    })
            }),
        pen: (0,
            B.jsx)("svg", {
                viewBox: "0 0 24 24",
                children: (0,
                    B.jsx)("path", {
                        d: "m5 19 3.8-.9 9.4-9.4a2 2 0 0 0-2.9-2.9L5.9 15.2 5 19Z"
                    })
            }),
        mic: (0,
            B.jsxs)("svg", {
                viewBox: "0 0 24 24",
                children: [(0,
                    B.jsx)("rect", {
                        x: "9",
                        y: "3",
                        width: "6",
                        height: "11",
                        rx: "3"
                    }), (0,
                        B.jsx)("path", {
                            d: "M6 11a6 6 0 0 0 12 0M12 17v3"
                        })]
            }),
        mail: (0,
            B.jsxs)("svg", {
                viewBox: "0 0 24 24",
                children: [(0,
                    B.jsx)("rect", {
                        x: "3.5",
                        y: "6",
                        width: "17",
                        height: "12",
                        rx: "2.5"
                    }), (0,
                        B.jsx)("path", {
                            d: "m4.5 7.5 7.5 5.5 7.5-5.5"
                        })]
            }),
        doc: (0,
            B.jsxs)("svg", {
                viewBox: "0 0 24 24",
                children: [(0,
                    B.jsx)("path", {
                        d: "M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z"
                    }), (0,
                        B.jsx)("path", {
                            d: "M9.5 11h6M9.5 14h6M9.5 17h4"
                        })]
            })
    };
    function en({ script: e, pill: t = "#000000", eyes: n = "#FFFFFF", scale: r = 1, follow: o = !0, seed: i, className: l = "", label: s = "Nixi" }) {
        let a = (0,
            we.useRef)(null)
            , u = (0,
                we.useRef)(null)
            , d = (0,
                we.useRef)(null)
            , h = (0,
                we.useRef)(null)
            , m = (0,
                we.useRef)(null)
            , v = (0,
                we.useRef)(null)
            , y = (0,
                we.useRef)(null)
            , S = (0,
                we.useRef)(null)
            , L = (0,
                we.useRef)(null)
            , f = (0,
                we.useMemo)(() => new bt({
                    seed: i,
                    animated: !le
                }), [i])
            , c = pt(a)
            , p = (0,
                we.useRef)({
                    t: 0,
                    w: 104,
                    h: 54,
                    vw: 0,
                    vh: 0,
                    text: null,
                    card: null,
                    icon: null,
                    app: null
                })
            , g = Ii(n, t);
        (0,
            we.useEffect)(() => {
                f.setPalette(n, t)
            }
                , [f, n, t]);
        let P = _ => {
            let w = p.current;
            w.t += _;
            let C = e(w.t) || {}
                , Y = C.shape || "rest"
                , [O, Qe] = Y === "card" ? [420, y0(C.card)] : h0[Y];
            if (le || _ === 0)
                w.w = O,
                    w.h = Qe,
                    w.vw = w.vh = 0;
            else {
                let Ae = 2 * Math.sqrt(Ca) * v0;
                for (let Ke = _; Ke > 1e-6; Ke -= 1 / 120) {
                    let Cn = Math.min(.008333333333333333, Ke);
                    w.vw += (Ca * (O - w.w) - Ae * w.vw) * Cn,
                        w.vh += (Ca * (Qe - w.h) - Ae * w.vh) * Cn,
                        w.w += w.vw * Cn,
                        w.h += w.vh * Cn
                }
            }
            let En = a.current;
            if (!En)
                return;
            En.style.width = w.w + "px",
                En.style.height = w.h + "px";
            let Gi = C.rim === "good" ? Pa : C.rim === "wait" ? _a : C.rim === "listen" ? "#C6D4F5" : null
                , Aa = C.rim === "listen" ? .35 + .5 * (C.level || 0) : .85;
            En.style.boxShadow = (Gi ? `0 0 0 1.5px ${xt(Gi, Aa)}, 0 0 22px ${xt(Gi, Aa * .45)}, ` : "") + "0 18px 40px rgba(16,17,20,0.22)";
            let Ba = Math.max(0, Math.min(1, (w.h - Bf) / 28))
                , Wa = Y === "card"
                , Yi = Y === "dictation";
            if (m.current && (m.current.style.opacity = Wa || Yi ? 0 : Ba),
                S.current && (S.current.style.opacity = Yi ? Ba : 0),
                v.current && (v.current.style.opacity = Wa ? Math.max(0, Math.min(1, (w.h - 80) / 30)) : 0),
                h.current && w.text !== (C.text || "") && (w.text = C.text || "",
                    h.current.textContent = w.text,
                    h.current.dataset.kind = C.textKind || ""),
                v.current && w.card !== (C.card || "") && (w.card = C.card || "",
                    v.current.querySelector("p").textContent = w.card,
                    v.current.querySelector("span").textContent = C.cardTitle || "Nixi"),
                y.current && w.icon !== (C.icon || "pointer") && (w.icon = C.icon || "pointer",
                    y.current.dataset.icon = w.icon),
                S.current && w.app !== (C.app || "mail")) {
                w.app = C.app || "mail";
                let Ae = w.app === "mail" || w.app === "doc";
                S.current.dataset.app = Ae ? w.app : "real",
                    Ae || (S.current.querySelector("img").src = `icons/${w.app}.png`)
            }
            y.current && y.current.classList.toggle("live", !!C.iconLive);
            let so = u.current;
            if (so) {
                so.style.left = (w.w - 84) / 2 + "px";
                let Ae = eo(so, 84, 45)
                    , Ke = C.look !== void 0 ? C.look : o ? Di(so) : null;
                f.advance(_, C.mood || "idle", C.level || 0, Ke),
                    f.paint(Ae, 0, 0, 84, 45)
            }
            let Ua = d.current;
            Ua && g0(eo(Ua, 24, 18), 24, 18, C.bars, C.level || 0, w.t, g.dim);
            let ja = L.current;
            if (ja && Yi) {
                let Ae = eo(ja, 40, 14);
                for (let Ke = 0; Ke < 5; Ke++) {
                    let Cn = C.bars === "listen" && C.level || 0
                        , vp = C.bars === "think" ? 3 + 2.5 * (1 + Math.sin(w.t * 6 - Ke * .85)) : C.bars === "done" ? 4 : Math.max(2.5, 3 + 5 * Cn * (.55 + .45 * Math.sin(w.t * 2.6 + Ke * 1.1)));
                    Ae.fillStyle = C.bars === "think" ? _a : C.bars === "done" ? Pa : Wf,
                        Ae.beginPath(),
                        Ae.arc(4 + Ke * 8, 7, vp / 2, 0, Math.PI * 2),
                        Ae.fill()
                }
            }
        }
            ;
        return ft(_ => P(_), c && !tt),
            (0,
                we.useEffect)(() => {
                    P(0)
                }
                ),
            (0,
                B.jsx)("div", {
                    className: "capsule-wrap " + l,
                    style: {
                        transform: `scale(${r})`
                    },
                    children: (0,
                        B.jsxs)("div", {
                            ref: a,
                            className: "capsule" + (ct(t) ? " light" : ""),
                            role: "img",
                            "aria-label": s,
                            style: {
                                background: t,
                                color: g.text,
                                "--dim": g.dim
                            },
                            children: [(0,
                                B.jsx)("canvas", {
                                    ref: u,
                                    className: "capsule-face",
                                    onClick: () => f.poke()
                                }), (0,
                                    B.jsxs)("div", {
                                        ref: m,
                                        className: "capsule-row",
                                        children: [(0,
                                            B.jsx)("canvas", {
                                                ref: d,
                                                className: "capsule-level"
                                            }), (0,
                                                B.jsx)("span", {
                                                    ref: h,
                                                    className: "capsule-text"
                                                }), (0,
                                                    B.jsx)("span", {
                                                        ref: y,
                                                        className: "capsule-icon",
                                                        "data-icon": "pointer",
                                                        children: Object.entries(Af).filter(([_]) => ["pointer", "pen", "mic"].includes(_)).map(([_, w]) => (0,
                                                            B.jsx)("i", {
                                                                "data-k": _,
                                                                children: w
                                                            }, _))
                                                    }), (0,
                                                        B.jsx)("span", {
                                                            className: "capsule-chev",
                                                            children: (0,
                                                                B.jsx)("svg", {
                                                                    viewBox: "0 0 24 24",
                                                                    children: (0,
                                                                        B.jsx)("path", {
                                                                            d: "m7 10 5 5 5-5"
                                                                        })
                                                                })
                                                        })]
                                    }), (0,
                                        B.jsxs)("div", {
                                            ref: S,
                                            className: "capsule-dict",
                                            "data-app": "mail",
                                            children: [(0,
                                                B.jsxs)("span", {
                                                    className: "capsule-app",
                                                    children: [["mail", "doc"].map(_ => (0,
                                                        B.jsx)("i", {
                                                            "data-k": _,
                                                            children: Af[_]
                                                        }, _)), (0,
                                                            B.jsx)("img", {
                                                                alt: "",
                                                                width: "20",
                                                                height: "20",
                                                                decoding: "async"
                                                            })]
                                                }), (0,
                                                    B.jsx)("canvas", {
                                                        ref: L
                                                    })]
                                        }), (0,
                                            B.jsxs)("div", {
                                                ref: v,
                                                className: "capsule-card",
                                                children: [(0,
                                                    B.jsx)("span", {
                                                        children: "Nixi"
                                                    }), (0,
                                                        B.jsx)("p", {})]
                                            })]
                        })
                })
    }
    var nt = R(ee());
    var F = R(A())
        , Nn = !0
        , w0 = "heynixi-windows-setup.exe"
        , Uf = "nixi-download-email"
        , xa = new Set
        , k0 = () => xa.forEach(e => e(!0));
    function to({ className: e = "", light: t = !1, children: n }) {
        let r = o => {
            o.preventDefault(),
                k0()
        }
            ;
        return (0,
            F.jsxs)("a", {
                className: "button " + (t ? "button-light " : "button-dark ") + e,
                href: "#download",
                onClick: r,
                children: [(0,
                    F.jsx)("svg", {
                        className: "win-logo",
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true",
                        children: (0,
                            F.jsx)("path", {
                                d: "M3 5.5 10.5 4.4v7H3zM11.5 4.3 21 3v8.4h-9.5zM3 12.6h7.5v7L3 18.5zM11.5 12.6H21V21l-9.5-1.3z"
                            })
                    }), n || (Nn ? "Download for Windows" : "Join the waitlist")]
            })
    }
    function S0() {
        try {
            return window.localStorage.getItem(Uf) || ""
        } catch {
            return ""
        }
    }
    function jf() {
        let [e, t] = (0,
            nt.useState)(!1)
            , [n, r] = (0,
                nt.useState)(S0)
            , [o, i] = (0,
                nt.useState)("ask")
            , [l, s] = (0,
                nt.useState)("")
            , [a, u] = (0,
                nt.useState)("")
            , d = (0,
                nt.useRef)(null);
        (0,
            nt.useEffect)(() => (xa.add(t),
                () => xa.delete(t)), []),
            (0,
                nt.useEffect)(() => {
                    if (!e)
                        return;
                    let v = document.activeElement;
                    i("ask"),
                        s("");
                    let y = S => {
                        S.key === "Escape" && t(!1)
                    }
                        ;
                    return window.addEventListener("keydown", y),
                        d.current?.focus(),
                        () => {
                            window.removeEventListener("keydown", y),
                                v && v.isConnected && typeof v.focus == "function" && v.focus()
                        }
                }
                    , [e]);
        let h = async v => {
            v.preventDefault();
            let y = new FormData(v.currentTarget);
            i("sending"),
                s("");
            try {
                let S = await fetch("/api/download", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        email: n,
                        website: y.get("website") || ""
                    })
                })
                    , L = await S.json().catch(() => ({}));
                if (!S.ok || !L.url) {
                    i("ask"),
                        L.suggestion ? s(`Did you mean ${L.suggestion}?`) : L.error === "invalid_email_domain" ? s("That email domain can't receive mail.") : L.error === "invalid_email" ? s("That email doesn't look right.") : s("Something went wrong. Try again?");
                    return
                }
                if (!Nn && L.stored !== !0) {
                    i("ask"),
                        s("We couldn't save your email. Please try again.");
                    return
                }
                try {
                    window.localStorage.setItem(Uf, n.trim())
                } catch { }
                u(L.url),
                    i(Nn ? "started" : "listed"),
                    Nn && (window.location.href = L.url)
            } catch {
                i("ask"),
                    s("Couldn't reach the server. Check your connection and try again.")
            }
        }
            ;
        if (!e)
            return null;
        let m = () => t(!1);
        return (0,
            F.jsx)("div", {
                className: "sheet-backdrop",
                onClick: m,
                children: (0,
                    F.jsxs)("div", {
                        ref: d,
                        className: "sheet",
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-labelledby": "sheet-title",
                        tabIndex: -1,
                        onClick: v => v.stopPropagation(),
                        children: [(0,
                            F.jsx)("button", {
                                className: "sheet-close",
                                type: "button",
                                onClick: m,
                                "aria-label": "Close download dialog",
                                children: "\xD7"
                            }), (0,
                                F.jsx)(ge, {
                                    width: 120,
                                    script: () => ({
                                        mood: o === "started" ? "happy" : o === "sending" ? "thinking" : "hover"
                                    }),
                                    label: "Nixi"
                                }), o === "listed" ? (0,
                                    F.jsxs)(F.Fragment, {
                                        children: [(0,
                                            F.jsx)("h3", {
                                                id: "sheet-title",
                                                children: "You're on the list."
                                            }), (0,
                                                F.jsx)("p", {
                                                    children: "We'll email you the download link the moment the beta opens."
                                                }), (0,
                                                    F.jsx)("button", {
                                                        className: "button button-dark",
                                                        type: "button",
                                                        onClick: m,
                                                        children: "Close"
                                                    })]
                                    }) : o !== "started" ? (0,
                                        F.jsxs)("form", {
                                            className: "sheet-form",
                                            onSubmit: h,
                                            children: [(0,
                                                F.jsx)("h3", {
                                                    id: "sheet-title",
                                                    children: Nn ? "Get Nixi for Windows" : "Join the Windows waitlist"
                                                }), (0,
                                                    F.jsx)("p", {
                                                        children: Nn ? "Try Nixi on Windows 10 or 11. Enter your email to download. Everything in the free version stays free." : "Downloads are paused while we improve setup. Leave your email and we'll send you the link when they return."
                                                    }), (0,
                                                        F.jsxs)("label", {
                                                            className: "sheet-field",
                                                            children: [(0,
                                                                F.jsx)("span", {
                                                                    className: "sr-only",
                                                                    children: "Email"
                                                                }), (0,
                                                                    F.jsx)("input", {
                                                                        type: "email",
                                                                        name: "email",
                                                                        required: !0,
                                                                        autoComplete: "email",
                                                                        inputMode: "email",
                                                                        placeholder: "you@example.com",
                                                                        value: n,
                                                                        onChange: v => r(v.target.value),
                                                                        disabled: o === "sending"
                                                                    })]
                                                        }), (0,
                                                            F.jsx)("input", {
                                                                className: "sheet-trap",
                                                                type: "text",
                                                                name: "website",
                                                                tabIndex: -1,
                                                                autoComplete: "off",
                                                                "aria-hidden": "true"
                                                            }), l && (0,
                                                                F.jsx)("p", {
                                                                    className: "sheet-error",
                                                                    role: "alert",
                                                                    children: l
                                                                }), (0,
                                                                    F.jsx)("button", {
                                                                        className: "button button-dark",
                                                                        type: "submit",
                                                                        disabled: o === "sending",
                                                                        children: o === "sending" ? "One moment\u2026" : Nn ? "Download" : "Send me the link"
                                                                    }), (0,
                                                                        F.jsxs)("p", {
                                                                            className: "sheet-fine",
                                                                            id: "sheet-fine",
                                                                            children: ["Your email is for beta access and product updates. Ask us to remove it any time. ", (0,
                                                                                F.jsx)("a", {
                                                                                    href: "privacy.html",
                                                                                    children: "Privacy"
                                                                                })]
                                                                        })]
                                        }) : (0,
                                            F.jsxs)(F.Fragment, {
                                                children: [(0,
                                                    F.jsx)("h3", {
                                                        id: "sheet-title",
                                                        children: "Your download is starting."
                                                    }), (0,
                                                        F.jsxs)("p", {
                                                            children: [w0, ". It installs just for you, no admin needed."]
                                                        }), (0,
                                                            F.jsxs)("ol", {
                                                                children: [(0,
                                                                    F.jsx)("li", {
                                                                        children: "Open the file when it finishes."
                                                                    }), (0,
                                                                        F.jsxs)("li", {
                                                                            children: ["This early build isn't code-signed yet, so Windows may say \u201CWindows protected your PC\u201D. Choose ", (0,
                                                                                F.jsx)("b", {
                                                                                    children: "More info"
                                                                                }), ", then ", (0,
                                                                                    F.jsx)("b", {
                                                                                        children: "Run anyway"
                                                                                    }), "."]
                                                                        }), (0,
                                                                            F.jsx)("li", {
                                                                                children: "Say \u201CHey Nixi\u201D."
                                                                            })]
                                                            }), (0,
                                                                F.jsx)("a", {
                                                                    className: "link",
                                                                    href: a,
                                                                    children: "Didn't start? Download again"
                                                                }), (0,
                                                                    F.jsx)("button", {
                                                                        className: "button button-dark",
                                                                        type: "button",
                                                                        onClick: m,
                                                                        children: "Close"
                                                                    })]
                                            })]
                    })
            })
    }
    var jv = R(ee());
    var Bv = R(ee())
        , Ta = R(A())
        , N0 = new Set(["gmail", "notion", "github", "whatsapp", "telegram", "figma", "linear", "googledocs", "reddit", "x", "perplexity", "trello"])
        , E0 = new Set(["calculator"]);
    function Mt({ name: e, size: t = 28, className: n = "" }) {
        let r = N0.has(e)
            , o = (0,
                Ta.jsx)("img", {
                    className: "app-icon " + (r ? "" : n),
                    src: `icons/${e}.${r || E0.has(e) ? "svg" : "png"}`,
                    width: r ? Math.round(t * .58) : t,
                    height: r ? Math.round(t * .58) : t,
                    alt: "",
                    decoding: "async",
                    draggable: "false"
                });
        return r ? (0,
            Ta.jsx)("span", {
                className: "brand-tile " + n,
                style: {
                    width: t,
                    height: t
                },
                children: o
            }) : o
    }
    var Le = R(A())
        , Vf = {
            edge: "edge",
            folder: "explorer",
            mail: "outlook"
        };
    function Lt({ kind: e }) {
        return Vf[e] ? (0,
            Le.jsx)(Mt, {
                name: Vf[e],
                size: 18,
                className: "window-app-img"
            }) : (0,
                Le.jsx)("span", {
                    className: "window-app-icon " + e,
                    "aria-hidden": "true",
                    children: (0,
                        Le.jsx)("span", {})
                })
    }
    function tn() {
        return (0,
            Le.jsxs)("span", {
                className: "window-controls",
                "aria-hidden": "true",
                children: [(0,
                    Le.jsx)("span", {
                        className: "window-minimize"
                    }), (0,
                        Le.jsx)("span", {
                            className: "window-maximize"
                        }), (0,
                            Le.jsx)("span", {
                                className: "window-close"
                            })]
            })
    }
    function Hf() {
        return (0,
            Le.jsxs)("span", {
                className: "start-glyph",
                "aria-hidden": "true",
                children: [(0,
                    Le.jsx)("i", {}), (0,
                        Le.jsx)("i", {}), (0,
                            Le.jsx)("i", {}), (0,
                                Le.jsx)("i", {})]
            })
    }
    var x = R(A());
    function C0(e) {
        return new Date(Date.now() + e * 6e4).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        })
    }
    var $f = [{
        say: "Play some lo-fi on Spotify.",
        result: "Playing lo-fi on Spotify.",
        stage: "music"
    }, {
        say: "Remind me in 20 minutes to stretch.",
        result: () => `Reminder set for ${C0(20)}.`,
        stage: "reminder"
    }, {
        say: "What's on my screen?",
        stage: "recipe",
        card: "You're reading a lemon garlic pasta recipe: about 20 minutes, serves two. Step one is getting the water on."
    }, {
        say: "Turn on dark mode.",
        result: "Dark mode on.",
        stage: "dark"
    }]
        , Ma = 6.4
        , no = .7
        , La = 2.6
        , Wi = 3.4
        , Bi = 5.3;
    function Kf(e) {
        let t = Ma * $f.length
            , n = (e % t + t) % t
            , r = Math.floor(n / Ma);
        return {
            index: r,
            st: n - r * Ma,
            scene: $f[r]
        }
    }
    function _0(e, t) {
        let n = e.split(" ");
        return n.slice(0, Math.max(1, Math.ceil(n.length * t))).join(" ")
    }
    function P0(e) {
        let { st: t, scene: n } = Kf(e);
        if (t < no || t >= Bi)
            return {
                shape: "rest",
                mood: t >= Bi && t < Bi + .4 ? "happy" : "idle"
            };
        if (t < La) {
            let i = (t - no - .15) / (La - no - .5);
            return {
                shape: "capsule",
                mood: "listening",
                level: dt(t),
                bars: "listen",
                rim: "listen",
                text: i <= 0 ? "Listening\u2026" : _0(n.say, i),
                textKind: i <= 0 ? "hint" : "live",
                icon: "pointer",
                iconLive: !0
            }
        }
        if (t < Wi)
            return {
                shape: "capsule",
                mood: "thinking",
                bars: "think",
                text: n.say,
                icon: "pointer"
            };
        let r = t < Wi + .7;
        if (n.card)
            return {
                shape: "card",
                mood: r ? "happy" : "idle",
                card: n.card,
                cardTitle: "On screen",
                rim: r ? "good" : null
            };
        let o = typeof n.result == "function" ? n.result() : n.result;
        return {
            shape: "capsule",
            mood: r ? "happy" : "idle",
            bars: "done",
            rim: r ? "good" : null,
            text: o,
            textKind: "done",
            icon: "pointer"
        }
    }
    function Qf(e) {
        let { index: t, st: n, scene: r } = Kf(e)
            , o = n >= Wi;
        return {
            index: t,
            music: t === 0 && o || t === 1,
            toast: t === 1 && o,
            recipe: t >= 2,
            dark: t === 3 && o,
            say: n >= no && n < Bi ? r.say : "",
            sayLive: n >= no && n < La
        }
    }
    function x0() {
        return (0,
            x.jsxs)("div", {
                className: "win win-music",
                children: [(0,
                    x.jsxs)("div", {
                        className: "win-bar",
                        children: [(0,
                            x.jsx)(Lt, {
                                kind: "media"
                            }), (0,
                                x.jsx)("span", {
                                    className: "win-title",
                                    children: "Media Player"
                                }), (0,
                                    x.jsx)(tn, {})]
                    }), (0,
                        x.jsxs)("div", {
                            className: "music",
                            children: [(0,
                                x.jsxs)("div", {
                                    className: "art",
                                    children: [(0,
                                        x.jsx)("span", {}), (0,
                                            x.jsx)("span", {}), (0,
                                                x.jsx)("span", {})]
                                }), (0,
                                    x.jsxs)("div", {
                                        className: "music-meta",
                                        children: [(0,
                                            x.jsx)("small", {
                                                children: "NOW PLAYING"
                                            }), (0,
                                                x.jsx)("strong", {
                                                    children: "lo-fi beats to focus to"
                                                }), (0,
                                                    x.jsx)("em", {
                                                        children: "Chill study mix"
                                                    }), (0,
                                                        x.jsx)("div", {
                                                            className: "eq",
                                                            children: Array.from({
                                                                length: 18
                                                            }, (e, t) => (0,
                                                                x.jsx)("b", {
                                                                    style: {
                                                                        animationDelay: `${-t * .13}s`
                                                                    }
                                                                }, t))
                                                        }), (0,
                                                            x.jsx)("div", {
                                                                className: "scrub",
                                                                children: (0,
                                                                    x.jsx)("span", {})
                                                            })]
                                    })]
                        })]
            })
    }
    function T0() {
        return (0,
            x.jsxs)("div", {
                className: "win win-recipe",
                children: [(0,
                    x.jsxs)("div", {
                        className: "win-bar",
                        children: [(0,
                            x.jsx)(Lt, {
                                kind: "edge"
                            }), (0,
                                x.jsx)("span", {
                                    className: "win-title",
                                    children: "Lemon garlic pasta \u2014 Microsoft Edge"
                                }), (0,
                                    x.jsx)(tn, {})]
                    }), (0,
                        x.jsxs)("div", {
                            className: "browser-toolbar",
                            children: [(0,
                                x.jsx)("span", {
                                    className: "browser-nav",
                                    "aria-hidden": "true",
                                    children: "\u2190 \xA0 \u2192 \xA0 \u21BB"
                                }), (0,
                                    x.jsxs)("span", {
                                        className: "url",
                                        children: [(0,
                                            x.jsx)("span", {
                                                "aria-hidden": "true",
                                                children: "\u2667"
                                            }), " recipes.example/lemon-garlic-pasta"]
                                    }), (0,
                                        x.jsx)("span", {
                                            className: "browser-more",
                                            "aria-hidden": "true",
                                            children: "\xB7\xB7\xB7"
                                        })]
                        }), (0,
                            x.jsxs)("div", {
                                className: "recipe",
                                children: [(0,
                                    x.jsx)("div", {
                                        className: "recipe-photo"
                                    }), (0,
                                        x.jsxs)("div", {
                                            children: [(0,
                                                x.jsx)("small", {
                                                    children: "20 MIN \xB7 SERVES 2"
                                                }), (0,
                                                    x.jsx)("strong", {
                                                        children: "Lemon garlic pasta"
                                                    }), (0,
                                                        x.jsx)("p", {
                                                            children: "Bright, quick and made from pantry staples. Get the water on first, then the garlic."
                                                        }), (0,
                                                            x.jsxs)("ul", {
                                                                children: [(0,
                                                                    x.jsx)("li", {
                                                                        children: "200 g spaghetti"
                                                                    }), (0,
                                                                        x.jsx)("li", {
                                                                            children: "3 cloves garlic"
                                                                        }), (0,
                                                                            x.jsx)("li", {
                                                                                children: "1 lemon, zest and juice"
                                                                            })]
                                                            })]
                                        })]
                            })]
            })
    }
    var M0 = 1100;
    function L0(e) {
        (0,
            zt.useEffect)(() => {
                let t = e.current;
                if (!t || typeof ResizeObserver > "u")
                    return;
                let n = () => t.style.setProperty("--k", String(Math.min(1, t.clientWidth / M0)))
                    , r = new ResizeObserver(n);
                return r.observe(t),
                    n(),
                    () => r.disconnect()
            }
                , [e])
    }
    function Gf() {
        let e = (0,
            zt.useRef)(null)
            , t = (0,
                zt.useRef)(null);
        L0(t);
        let n = (0,
            zt.useRef)(le ? Wi + .8 : rr)
            , r = pt(e, "0px")
            , [o, i] = (0,
                zt.useState)(() => Qf(n.current))
            , l = (0,
                zt.useRef)("");
        ft(a => {
            n.current += a;
            let u = Qf(n.current)
                , d = JSON.stringify(u);
            d !== l.current && (l.current = d,
                i(u))
        }
            , r && !le && !tt);
        let s = () => P0(n.current);
        return (0,
            x.jsxs)("section", {
                className: "hero",
                id: "top",
                children: [(0,
                    x.jsxs)("div", {
                        className: "hero-copy",
                        children: [(0,
                            x.jsx)("p", {
                                className: "eyebrow rise",
                                style: {
                                    "--d": "0ms"
                                },
                                children: "A voice assistant for Windows"
                            }), (0,
                                x.jsx)("h1", {
                                    className: "rise",
                                    style: {
                                        "--d": "80ms"
                                    },
                                    children: "Meet Nixi."
                                }), (0,
                                    x.jsx)("p", {
                                        className: "lede rise",
                                        style: {
                                            "--d": "160ms"
                                        },
                                        children: "It lives at the top of your screen and does what you say. Your voice stays on your PC. Nixi goes online when you ask."
                                    }), (0,
                                        x.jsxs)("div", {
                                            className: "hero-actions rise",
                                            style: {
                                                "--d": "240ms"
                                            },
                                            children: [(0,
                                                x.jsx)(to, {}), (0,
                                                    x.jsx)("a", {
                                                        className: "link",
                                                        href: "#modes",
                                                        children: "See what it can do"
                                                    })]
                                        }), (0,
                                            x.jsx)("p", {
                                                className: "fine rise",
                                                style: {
                                                    "--d": "320ms"
                                                },
                                                children: "Windows beta \xB7 Free version stays free \xB7 Local speech and AI"
                                            })]
                    }), (0,
                        x.jsx)("div", {
                            ref: t,
                            className: "hero-frame rise",
                            style: {
                                "--d": "200ms"
                            },
                            children: (0,
                                x.jsxs)("div", {
                                    ref: e,
                                    className: "hero-stage",
                                    "data-theme": o.dark ? "dark" : "light",
                                    children: [(0,
                                        x.jsxs)("div", {
                                            className: "desk",
                                            children: [(0,
                                                x.jsx)("div", {
                                                    className: "pane " + (o.music ? "in" : ""),
                                                    children: (0,
                                                        x.jsx)(x0, {})
                                                }), (0,
                                                    x.jsx)("div", {
                                                        className: "pane " + (o.recipe ? "in" : ""),
                                                        children: (0,
                                                            x.jsx)(T0, {})
                                                    }), (0,
                                                        x.jsxs)("div", {
                                                            className: "toast " + (o.toast ? "in" : ""),
                                                            children: [(0,
                                                                x.jsx)("span", {
                                                                    className: "toast-pill"
                                                                }), (0,
                                                                    x.jsxs)("div", {
                                                                        children: [(0,
                                                                            x.jsx)("strong", {
                                                                                children: "Stretch"
                                                                            }), (0,
                                                                                x.jsx)("small", {
                                                                                    children: "Reminder \xB7 in 20 minutes"
                                                                                })]
                                                                    })]
                                                        }), (0,
                                                            x.jsxs)("div", {
                                                                className: "taskbar",
                                                                children: [(0,
                                                                    x.jsxs)("div", {
                                                                        className: "task-apps",
                                                                        children: [(0,
                                                                            x.jsx)("span", {
                                                                                className: "start-button",
                                                                                children: (0,
                                                                                    x.jsx)(Hf, {})
                                                                            }), (0,
                                                                                x.jsxs)("span", {
                                                                                    className: "task-search",
                                                                                    children: ["\u2315 ", (0,
                                                                                        x.jsx)("small", {
                                                                                            children: "Search"
                                                                                        })]
                                                                                }), (0,
                                                                                    x.jsx)(Lt, {
                                                                                        kind: "edge"
                                                                                    }), (0,
                                                                                        x.jsx)(Lt, {
                                                                                            kind: "folder"
                                                                                        }), (0,
                                                                                            x.jsx)(Lt, {
                                                                                                kind: "media"
                                                                                            })]
                                                                    }), (0,
                                                                        x.jsx)("span", {
                                                                            className: "task-clock",
                                                                            children: new Date().toLocaleTimeString([], {
                                                                                hour: "numeric",
                                                                                minute: "2-digit"
                                                                            })
                                                                        })]
                                                            })]
                                        }), (0,
                                            x.jsx)("div", {
                                                className: "hero-notch",
                                                children: (0,
                                                    x.jsx)(en, {
                                                        script: s,
                                                        seed: 7,
                                                        label: "Nixi responding to a voice command"
                                                    })
                                            }), (0,
                                                x.jsxs)("p", {
                                                    className: "subtitle " + (o.say ? "in" : ""),
                                                    "aria-live": "polite",
                                                    children: [(0,
                                                        x.jsx)("span", {
                                                            className: "wake",
                                                            children: "Hey Nixi,"
                                                        }), " ", o.say || " "]
                                                })]
                                })
                        })]
            })
    }
    var Jv = R(ee());
    var mt = R(A())
        , z0 = [["chrome", "Chrome"], ["gmail", "Gmail"], ["outlook", "Outlook"], ["word", "Word"], ["notion", "Notion"], ["vscode", "VS Code"], ["discord", "Discord"], ["whatsapp", "WhatsApp"], ["excel", "Excel"], ["figma", "Figma"], ["cursor", "Cursor"], ["github", "GitHub"], ["spotify", "Spotify"], ["telegram", "Telegram"], ["powerpoint", "PowerPoint"], ["linear", "Linear"], ["obsidian", "Obsidian"], ["googledocs", "Google Docs"], ["zoom", "Zoom"], ["reddit", "Reddit"], ["claude", "Claude"], ["perplexity", "Perplexity"], ["edge", "Edge"], ["x", "X"], ["brave", "Brave"], ["trello", "Trello"], ["explorer", "File Explorer"]];
    function Yf() {
        let e = t => z0.map(([n, r]) => (0,
            mt.jsxs)("li", {
                "aria-hidden": t ? "true" : void 0,
                title: r,
                children: [(0,
                    mt.jsx)(Mt, {
                        name: n,
                        size: 44
                    }), (0,
                        mt.jsx)("span", {
                            children: r
                        })]
            }, t + n));
        return (0,
            mt.jsxs)("section", {
                className: "strip",
                "aria-label": "Apps Nixi works in",
                children: [(0,
                    mt.jsxs)("p", {
                        className: "strip-label",
                        children: [(0,
                            mt.jsx)("span", {
                                className: "dot",
                                "aria-hidden": "true"
                            }), "Works in the apps you already use"]
                    }), (0,
                        mt.jsx)("div", {
                            className: "strip-window",
                            children: (0,
                                mt.jsxs)("ul", {
                                    className: "strip-track",
                                    children: [e(""), e("b")]
                                })
                        })]
            })
    }
    var rt = R(ee());
    var ny = R(ee());
    var ue = R(A());
    function Ui(e) {
        let t = []
            , n = "";
        for (let r of e.split(" ")) {
            let o = r;
            o.startsWith("[") && (n = "drop",
                o = o.slice(1)),
                o.startsWith("{") && (n = "cmd",
                    o = o.slice(1));
            let i = o.endsWith("]") || o.endsWith("}");
            i && (o = o.slice(0, -1)),
                t.push({
                    w: o,
                    kind: n
                }),
                i && (n = "")
        }
        return t
    }
    function ji({ words: e, shown: t, clean: n, out: r }) {
        return (0,
            ue.jsxs)("div", {
                className: "said" + (t ? " on" : "") + (r ? " out" : ""),
                "aria-hidden": "true",
                children: [(0,
                    ue.jsxs)("span", {
                        className: "said-tag",
                        children: [(0,
                            ue.jsx)("i", {}), (0,
                                ue.jsx)("i", {}), (0,
                                    ue.jsx)("i", {})]
                    }), (0,
                        ue.jsx)("p", {
                            children: (0,
                                ue.jsx)("span", {
                                    children: e.slice(0, t).map((o, i) => (0,
                                        ue.jsxs)("span", {
                                            className: o.kind + (n && o.kind ? " cut" : ""),
                                            children: [o.w, " "]
                                        }, i))
                                })
                        })]
            })
    }
    function Vi({ text: e, caret: t }) {
        let n = 0
            , r = l => l.split(" ").map((s, a) => (0,
                ue.jsxs)("span", {
                    className: "land",
                    style: {
                        "--i": n++
                    },
                    children: [s, " "]
                }, a))
            , o = e.split(`
`)
            , i = [];
        for (let l = 0; l < o.length; l++)
            if (o[l].startsWith("- ")) {
                let s = [];
                for (; l < o.length && o[l].startsWith("- ");)
                    s.push(o[l++].slice(2));
                l--,
                    i.push((0,
                        ue.jsx)("ul", {
                            children: s.map((a, u) => (0,
                                ue.jsx)("li", {
                                    children: r(a)
                                }, u))
                        }, l))
            } else
                i.push((0,
                    ue.jsx)("span", {
                        className: "typed-line",
                        children: r(o[l])
                    }, l));
        return (0,
            ue.jsxs)(ue.Fragment, {
                children: [i, t && (0,
                    ue.jsx)("span", {
                        className: "caret"
                    })]
            })
    }
    function Hi(e, { speakFrom: t = .8, wordS: n = .19 } = {}) {
        let r = t + e.length * n + .25
            , o = r + .55;
        return {
            speakFrom: t,
            wordS: n,
            talkEnd: r,
            land: o,
            captionOut: o + 1.2,
            rest: o + 2.3,
            length: o + 3.3
        }
    }
    function $i(e, t, n) {
        let r = e < n.speakFrom ? 0 : Math.min(t.length, Math.floor((e - n.speakFrom) / n.wordS) + 1);
        return {
            shown: e >= n.captionOut + .4 ? 0 : r,
            clean: e >= n.land,
            out: e >= n.captionOut,
            landed: e >= n.land && e < n.length - .25,
            caret: e >= .5 && e < n.length - .25
        }
    }
    function Qi(e, t, n) {
        return e < .5 || e >= t.rest ? {
            shape: "rest",
            mood: "idle"
        } : e < t.talkEnd ? {
            shape: "dictation",
            mood: "listening",
            level: dt(e),
            bars: "listen",
            app: n
        } : e < t.land ? {
            shape: "dictation",
            mood: "thinking",
            bars: "think",
            app: n
        } : {
            shape: "dictation",
            mood: e < t.land + .8 ? "happy" : "idle",
            bars: "done",
            rim: e < t.land + .7 ? "good" : null,
            app: n
        }
    }
    var k = R(A())
        , ht = [{
            id: "outlook",
            app: "Outlook",
            said: "Hi Priya, [um,] the launch is on track for [Thursday, actually] Friday. [Uh,] I'll send the notes tonight.",
            typed: "Hi Priya, the launch is on track for Friday. I'll send the notes tonight."
        }, {
            id: "word",
            app: "Word",
            said: "[Um,] three things for Monday. {Bullet point} ship the beta. {Bullet point} fix the login bug. {Bullet point} book the venue.",
            typed: `Three things for Monday.
- Ship the beta.
- Fix the login bug.
- Book the venue.`
        }, {
            id: "vscode",
            app: "VS Code",
            said: "[Um,] retry the request three times before giving up.",
            typed: "Retry the request three times before giving up."
        }, {
            id: "discord",
            app: "Discord",
            said: "Anyone up for a game tonight? [Um,] I'm free after [seven, actually] eight.",
            typed: "Anyone up for a game tonight? I'm free after eight."
        }, {
            id: "chrome",
            app: "Chrome",
            said: "[Um,] shipping the beta today. [Uh,] six months of work and I couldn't be more excited.",
            typed: "Shipping the beta today. Six months of work and I couldn't be more excited."
        }].map(e => {
            let t = Ui(e.said);
            return {
                ...e,
                words: t,
                tl: Hi(t)
            }
        }
        );
    function za(e, t) {
        return $i(e, t.words, t.tl)
    }
    function ro({ scene: e, view: t }) {
        return t.landed ? (0,
            k.jsx)(Vi, {
                text: e.typed,
                caret: t.caret
            }) : t.caret ? (0,
                k.jsx)("span", {
                    className: "caret"
                }) : null
    }
    function oo({ scene: e, title: t }) {
        return (0,
            k.jsxs)("div", {
                className: "ev-bar",
                children: [(0,
                    k.jsx)(Mt, {
                        name: e.id,
                        size: 16
                    }), (0,
                        k.jsx)("span", {
                            children: t || e.app
                        }), (0,
                            k.jsx)(tn, {})]
            })
    }
    var R0 = {
        outlook: (e, t) => (0,
            k.jsxs)("div", {
                className: "ev-win ev-outlook",
                children: [(0,
                    k.jsx)(oo, {
                        scene: e,
                        title: "New message - Outlook"
                    }), (0,
                        k.jsxs)("div", {
                            className: "ev-ribbon",
                            children: [(0,
                                k.jsx)("b", {
                                    children: "Send"
                                }), (0,
                                    k.jsx)("span", {
                                        children: "Attach"
                                    }), (0,
                                        k.jsx)("span", {
                                            children: "Insert"
                                        }), (0,
                                            k.jsx)("span", {
                                                children: "Options"
                                            })]
                        }), (0,
                            k.jsxs)("div", {
                                className: "ev-row",
                                children: [(0,
                                    k.jsx)("b", {
                                        children: "To"
                                    }), (0,
                                        k.jsx)("span", {
                                            children: "Priya Shah"
                                        })]
                            }), (0,
                                k.jsxs)("div", {
                                    className: "ev-row",
                                    children: [(0,
                                        k.jsx)("b", {
                                            children: "Subject"
                                        }), (0,
                                            k.jsx)("span", {
                                                children: "Launch notes"
                                            })]
                                }), (0,
                                    k.jsx)("p", {
                                        className: "ev-body",
                                        children: (0,
                                            k.jsx)(ro, {
                                                scene: e,
                                                view: t
                                            })
                                    })]
            }),
        word: (e, t) => (0,
            k.jsxs)("div", {
                className: "ev-win ev-word",
                children: [(0,
                    k.jsx)(oo, {
                        scene: e,
                        title: "Team sync - Word"
                    }), (0,
                        k.jsxs)("div", {
                            className: "ev-ribbon",
                            children: [(0,
                                k.jsx)("b", {
                                    children: "Home"
                                }), (0,
                                    k.jsx)("span", {
                                        children: "Insert"
                                    }), (0,
                                        k.jsx)("span", {
                                            children: "Layout"
                                        }), (0,
                                            k.jsx)("span", {
                                                children: "Review"
                                            })]
                        }), (0,
                            k.jsxs)("div", {
                                className: "ev-page",
                                children: [(0,
                                    k.jsx)("h4", {
                                        children: "Team sync"
                                    }), (0,
                                        k.jsx)("div", {
                                            className: "ev-body",
                                            children: (0,
                                                k.jsx)(ro, {
                                                    scene: e,
                                                    view: t
                                                })
                                        })]
                            })]
            }),
        vscode: (e, t) => (0,
            k.jsxs)("div", {
                className: "ev-win ev-code",
                children: [(0,
                    k.jsx)(oo, {
                        scene: e,
                        title: "api.ts - Visual Studio Code"
                    }), (0,
                        k.jsxs)("div", {
                            className: "ev-tabs-row",
                            children: [(0,
                                k.jsx)("span", {
                                    children: "api.ts"
                                }), (0,
                                    k.jsx)("span", {
                                        children: "client.ts"
                                    })]
                        }), (0,
                            k.jsxs)("pre", {
                                className: "ev-editor",
                                children: [(0,
                                    k.jsxs)("code", {
                                        children: [(0,
                                            k.jsx)("i", {
                                                children: "1"
                                            }), (0,
                                                k.jsx)("b", {
                                                    children: "async function"
                                                }), " ", (0,
                                                    k.jsx)("em", {
                                                        children: "getUser"
                                                    }), "(id: string) ", "{"]
                                    }), (0,
                                        k.jsxs)("code", {
                                            children: [(0,
                                                k.jsx)("i", {
                                                    children: "2"
                                                }), "  ", (0,
                                                    k.jsxs)("span", {
                                                        className: "ev-comment",
                                                        children: ["// ", (0,
                                                            k.jsx)(ro, {
                                                                scene: e,
                                                                view: t
                                                            })]
                                                    })]
                                        }), (0,
                                            k.jsxs)("code", {
                                                children: [(0,
                                                    k.jsx)("i", {
                                                        children: "3"
                                                    }), "  ", (0,
                                                        k.jsx)("b", {
                                                            children: "for"
                                                        }), " (", (0,
                                                            k.jsx)("b", {
                                                                children: "let"
                                                            }), " n = 0; n < 3; n++) ", "{", " \u2026 ", "}"]
                                            }), (0,
                                                k.jsxs)("code", {
                                                    children: [(0,
                                                        k.jsx)("i", {
                                                            children: "4"
                                                        }), "}"]
                                                })]
                            })]
            }),
        discord: (e, t) => (0,
            k.jsxs)("div", {
                className: "ev-win ev-chat",
                children: [(0,
                    k.jsx)(oo, {
                        scene: e,
                        title: "# general - Discord"
                    }), (0,
                        k.jsxs)("div", {
                            className: "ev-chat-body",
                            children: [(0,
                                k.jsxs)("div", {
                                    className: "ev-msg",
                                    children: [(0,
                                        k.jsx)("i", {
                                            style: {
                                                background: "#F59E0B"
                                            }
                                        }), (0,
                                            k.jsxs)("div", {
                                                children: [(0,
                                                    k.jsx)("b", {
                                                        children: "Sam"
                                                    }), (0,
                                                        k.jsx)("p", {
                                                            children: "Who's around later?"
                                                        })]
                                            })]
                                }), (0,
                                    k.jsxs)("div", {
                                        className: "ev-msg",
                                        children: [(0,
                                            k.jsx)("i", {
                                                style: {
                                                    background: "#22C55E"
                                                }
                                            }), (0,
                                                k.jsxs)("div", {
                                                    children: [(0,
                                                        k.jsx)("b", {
                                                            children: "Maya"
                                                        }), (0,
                                                            k.jsx)("p", {
                                                                children: "Me! Finished the project \u{1F389}"
                                                            })]
                                                })]
                                    })]
                        }), (0,
                            k.jsxs)("div", {
                                className: "ev-input",
                                children: [(0,
                                    k.jsx)("span", {
                                        children: "+"
                                    }), (0,
                                        k.jsx)("p", {
                                            className: "ev-body",
                                            children: (0,
                                                k.jsx)(ro, {
                                                    scene: e,
                                                    view: t
                                                })
                                        })]
                            })]
            }),
        chrome: (e, t) => (0,
            k.jsxs)("div", {
                className: "ev-win ev-browser",
                children: [(0,
                    k.jsx)(oo, {
                        scene: e,
                        title: "Home / X - Chrome"
                    }), (0,
                        k.jsxs)("div", {
                            className: "ev-addr",
                            children: [(0,
                                k.jsx)("span", {
                                    children: "\u2039 \u203A \u27F3"
                                }), (0,
                                    k.jsx)("b", {
                                        children: "x.com/home"
                                    })]
                        }), (0,
                            k.jsxs)("div", {
                                className: "ev-post",
                                children: [(0,
                                    k.jsx)("i", {
                                        className: "ev-avatar",
                                        "aria-hidden": "true"
                                    }), (0,
                                        k.jsxs)("div", {
                                            children: [(0,
                                                k.jsx)("p", {
                                                    className: "ev-body",
                                                    children: t.landed ? (0,
                                                        k.jsx)(ro, {
                                                            scene: e,
                                                            view: t
                                                        }) : (0,
                                                            k.jsxs)(k.Fragment, {
                                                                children: [(0,
                                                                    k.jsx)("span", {
                                                                        className: "ev-ph",
                                                                        children: "What's happening?"
                                                                    }), t.caret && (0,
                                                                        k.jsx)("span", {
                                                                            className: "caret"
                                                                        })]
                                                            })
                                                }), (0,
                                                    k.jsxs)("div", {
                                                        className: "ev-post-foot",
                                                        children: [(0,
                                                            k.jsx)("span", {
                                                                "aria-hidden": "true",
                                                                children: "\u25A2 \u25CE \u263A"
                                                            }), (0,
                                                                k.jsx)("b", {
                                                                    children: "Post"
                                                                })]
                                                    })]
                                        })]
                            })]
            })
    };
    function Xf() {
        let e = (0,
            rt.useRef)(null)
            , [t, n] = (0,
                rt.useState)(0)
            , r = ht[t]
            , o = (0,
                rt.useRef)(le ? ht[0].tl.land + 1.6 : rr % ht[0].tl.length)
            , i = pt(e, "0px")
            , [l, s] = (0,
                rt.useState)(() => za(o.current, r))
            , a = (0,
                rt.useRef)("")
            , u = (0,
                rt.useRef)(0)
            , d = (0,
                rt.useRef)(null);
        u.current = t,
            (0,
                rt.useEffect)(() => {
                    let m = d.current
                        , v = m && m.children[t];
                    m && v && m.scrollWidth > m.clientWidth && m.scrollTo({
                        left: v.offsetLeft - (m.clientWidth - v.clientWidth) / 2,
                        behavior: le ? "auto" : "smooth"
                    })
                }
                    , [t]);
        let h = m => {
            o.current = 0,
                u.current = m,
                n(m),
                s(za(0, ht[m]))
        }
            ;
        return ft(m => {
            if (o.current += m,
                o.current >= ht[u.current].tl.length) {
                o.current = 0;
                let S = (u.current + 1) % ht.length;
                u.current = S,
                    n(S)
            }
            let v = za(o.current, ht[u.current])
                , y = u.current + JSON.stringify(v);
            y !== a.current && (a.current = y,
                s(v))
        }
            , i && !le && !tt),
            (0,
                k.jsxs)("section", {
                    className: "section everywhere",
                    id: "everywhere",
                    children: [(0,
                        k.jsxs)("div", {
                            className: "intro",
                            children: [(0,
                                k.jsx)("p", {
                                    className: "eyebrow",
                                    children: "One hotkey, any app"
                                }), (0,
                                    k.jsx)("h2", {
                                        children: "It types wherever you are."
                                    }), (0,
                                        k.jsx)("p", {
                                            children: "Hold a key and talk the way you talk. Nixi takes out the ums, catches it when you change your mind, and types clean, punctuated text into whatever app you're in."
                                        })]
                        }), (0,
                            k.jsxs)("div", {
                                className: "ev-card",
                                children: [(0,
                                    k.jsx)("div", {
                                        ref: d,
                                        className: "ev-tabs",
                                        role: "tablist",
                                        "aria-label": "Pick an app",
                                        children: ht.map((m, v) => (0,
                                            k.jsxs)("button", {
                                                role: "tab",
                                                "aria-selected": v === t,
                                                className: "ev-tab" + (v === t ? " on" : ""),
                                                onClick: () => h(v),
                                                children: [(0,
                                                    k.jsx)(Mt, {
                                                        name: m.id,
                                                        size: 26
                                                    }), (0,
                                                        k.jsx)("span", {
                                                            children: m.app
                                                        })]
                                            }, m.id))
                                    }), (0,
                                        k.jsxs)("div", {
                                            ref: e,
                                            className: "ev-stage",
                                            role: "tabpanel",
                                            "aria-live": "off",
                                            children: [(0,
                                                k.jsx)("div", {
                                                    className: "demo-notch",
                                                    children: (0,
                                                        k.jsx)(en, {
                                                            script: () => Qi(o.current, ht[u.current].tl, ht[u.current].id),
                                                            scale: .86,
                                                            seed: 61
                                                        })
                                                }), R0[r.id](r, l), (0,
                                                    k.jsx)(ji, {
                                                        words: r.words,
                                                        shown: l.shown,
                                                        clean: l.clean,
                                                        out: l.out
                                                    })]
                                        })]
                            })]
                })
    }
    var py = R(ee());
    var j = R(A())
        , I0 = [["Your voice", "Turned into text on your own PC. The audio is never uploaded.", "Uploaded to a server to be transcribed."], ["No internet", "Keeps typing. On a plane, on hotel Wi\u2011Fi, anywhere.", "Stops working."], ["The polish", "Ums out, corrections caught, lists and punctuation in.", "Much the same, done on their servers."], ["Your words", "Nothing to leak. There is no copy anywhere but your PC.", "Handled by their servers, under their privacy policy."], ["Price", "Free forever. No word limits.", "Usually a monthly subscription, with a word cap on the free plan."]]
        , F0 = () => (0,
            j.jsxs)("svg", {
                className: "cmp-mark",
                viewBox: "0 0 20 20",
                "aria-hidden": "true",
                children: [(0,
                    j.jsx)("circle", {
                        cx: "10",
                        cy: "10",
                        r: "10"
                    }), (0,
                        j.jsx)("path", {
                            d: "M5.8 10.4l2.7 2.6 5.7-6"
                        })]
            })
        , D0 = () => (0,
            j.jsx)("svg", {
                className: "cmp-cloud",
                viewBox: "0 0 32 22",
                "aria-hidden": "true",
                children: (0,
                    j.jsx)("path", {
                        d: "M9 20.5h15a6.5 6.5 0 0 0 .9-12.9A9 9 0 0 0 7.6 9.1 5.8 5.8 0 0 0 9 20.5Z"
                    })
            });
    function qf() {
        return (0,
            j.jsxs)("section", {
                className: "section compare",
                id: "compare",
                children: [(0,
                    j.jsxs)("div", {
                        className: "intro",
                        children: [(0,
                            j.jsx)("p", {
                                className: "eyebrow",
                                children: "Free forever"
                            }), (0,
                                j.jsx)("h2", {
                                    children: "Dictation that never leaves your PC."
                                }), (0,
                                    j.jsx)("p", {
                                        children: "Most dictation apps send your voice to a server and charge you monthly for it. Nixi does the whole thing on your PC, keeps working with the Wi\u2011Fi off, and its dictation is free. For good."
                                    })]
                    }), (0,
                        j.jsxs)("div", {
                            className: "cmp",
                            role: "table",
                            "aria-label": "Nixi compared with cloud dictation apps",
                            children: [(0,
                                j.jsxs)("div", {
                                    className: "cmp-head",
                                    role: "row",
                                    children: [(0,
                                        j.jsx)("span", {
                                            role: "columnheader",
                                            className: "cmp-blank"
                                        }), (0,
                                            j.jsxs)("div", {
                                                role: "columnheader",
                                                className: "cmp-us",
                                                children: [(0,
                                                    j.jsx)(ge, {
                                                        width: 60,
                                                        follow: !0,
                                                        seed: 140,
                                                        shadow: !1,
                                                        label: "Nixi"
                                                    }), (0,
                                                        j.jsx)("b", {
                                                            children: "Nixi"
                                                        }), (0,
                                                            j.jsx)("small", {
                                                                children: "On your PC"
                                                            })]
                                            }), (0,
                                                j.jsxs)("div", {
                                                    role: "columnheader",
                                                    className: "cmp-them",
                                                    children: [(0,
                                                        j.jsx)(D0, {}), (0,
                                                            j.jsx)("b", {
                                                                children: "Cloud dictation"
                                                            }), (0,
                                                                j.jsx)("small", {
                                                                    children: "Most other apps"
                                                                })]
                                                })]
                                }), I0.map(([e, t, n]) => (0,
                                    j.jsxs)("div", {
                                        className: "cmp-row",
                                        role: "row",
                                        children: [(0,
                                            j.jsx)("h3", {
                                                role: "rowheader",
                                                children: e
                                            }), (0,
                                                j.jsxs)("p", {
                                                    role: "cell",
                                                    className: "cmp-yes",
                                                    children: [(0,
                                                        j.jsx)(F0, {}), t]
                                                }), (0,
                                                    j.jsx)("p", {
                                                        role: "cell",
                                                        className: "cmp-no",
                                                        children: n
                                                    })]
                                    }, e))]
                        }), (0,
                            j.jsx)("p", {
                                className: "cmp-note",
                                children: "Compared with dictation apps that transcribe in the cloud, as of October 2026. Plans change, so check each app's own site."
                            })]
            })
    }
    var nn = R(ee());
    var M = R(A())
        , Zf = 8.5;
    function Fa(e, t, n) {
        let r = (0,
            nn.useRef)(le ? n : rr % Zf)
            , o = pt(e, "0px")
            , [i, l] = (0,
                nn.useState)(() => t(r.current))
            , s = (0,
                nn.useRef)("");
        return ft(a => {
            r.current = (r.current + a) % Zf;
            let u = t(r.current)
                , d = JSON.stringify(u);
            d !== s.current && (s.current = d,
                l(u))
        }
            , o && !le && !tt),
            [i, () => r.current]
    }
    var ep = (e, t) => {
        let n = e.split(" ");
        return n.slice(0, Math.max(0, Math.ceil(n.length * Math.min(1, t)))).join(" ")
    }
        , Jf = "Open Chrome, Spotify, and Calculator."
        , bf = [{
            at: 1.9,
            name: "Chrome",
            icon: "chrome"
        }, {
            at: 2.6,
            name: "Spotify",
            icon: "spotify"
        }, {
            at: 3.5,
            name: "Calculator",
            icon: "calculator"
        }];
    function O0(e) {
        if (e < .6 || e >= 6.6)
            return {
                shape: "rest",
                mood: "idle"
            };
        if (e < 3.6) {
            let t = (e - .8) / 2.6;
            return {
                shape: "capsule",
                mood: "listening",
                level: dt(e),
                bars: "listen",
                rim: "listen",
                text: t <= 0 ? "Listening\u2026" : ep(Jf, t),
                textKind: t <= 0 ? "hint" : "live",
                icon: "pointer",
                iconLive: !0
            }
        }
        return e < 4 ? {
            shape: "capsule",
            mood: "thinking",
            bars: "think",
            text: Jf,
            icon: "pointer"
        } : {
            shape: "capsule",
            mood: e < 4.8 ? "happy" : "idle",
            bars: "done",
            rim: e < 4.7 ? "good" : null,
            text: "Opened 3 apps.",
            textKind: "done",
            icon: "pointer"
        }
    }
    function A0() {
        let e = (0,
            nn.useRef)(null)
            , [t, n] = Fa(e, r => ({
                open: bf.map(o => r >= o.at && r < 7.6)
            }), 5);
        return (0,
            M.jsxs)("div", {
                ref: e,
                className: "demo-stage",
                children: [(0,
                    M.jsx)("div", {
                        className: "demo-notch",
                        children: (0,
                            M.jsx)(en, {
                                script: () => O0(n()),
                                scale: .86,
                                seed: 21
                            })
                    }), (0,
                        M.jsx)("div", {
                            className: "apps",
                            children: bf.map((r, o) => (0,
                                M.jsxs)("div", {
                                    className: "app-tile " + (t.open[o] ? "in" : ""),
                                    children: [(0,
                                        M.jsxs)("span", {
                                            className: "app-tile-bar",
                                            children: [(0,
                                                M.jsx)("span", {
                                                    children: r.name
                                                }), (0,
                                                    M.jsx)("i", {})]
                                        }), (0,
                                            M.jsx)(Mt, {
                                                name: r.icon,
                                                size: 44
                                            }), (0,
                                                M.jsx)("small", {
                                                    children: r.name
                                                })]
                                }, r.name))
                        })]
            })
    }
    var Ia = Ui("Hey Sam, I'm running about [ten, actually] fifteen minutes late. [Uh,] save me a seat!")
        , B0 = "Hey Sam, I'm running about fifteen minutes late. Save me a seat!"
        , Ra = Hi(Ia, {
            speakFrom: .7,
            wordS: .2
        });
    function W0() {
        let e = (0,
            nn.useRef)(null)
            , [t, n] = Fa(e, r => $i(r, Ia, Ra), Ra.land + 1.6);
        return (0,
            M.jsxs)("div", {
                ref: e,
                className: "demo-stage",
                children: [(0,
                    M.jsx)("div", {
                        className: "demo-notch",
                        children: (0,
                            M.jsx)(en, {
                                script: () => Qi(n(), Ra, "outlook"),
                                scale: .86,
                                seed: 33
                            })
                    }), (0,
                        M.jsxs)("div", {
                            className: "mail",
                            children: [(0,
                                M.jsxs)("div", {
                                    className: "demo-window-bar",
                                    children: [(0,
                                        M.jsx)(Lt, {
                                            kind: "mail"
                                        }), (0,
                                            M.jsx)("span", {
                                                children: "New message - Outlook"
                                            }), (0,
                                                M.jsx)(tn, {})]
                                }), (0,
                                    M.jsxs)("div", {
                                        className: "mail-row",
                                        children: [(0,
                                            M.jsx)("b", {
                                                children: "To"
                                            }), (0,
                                                M.jsx)("span", {
                                                    children: "Sam"
                                                })]
                                    }), (0,
                                        M.jsxs)("div", {
                                            className: "mail-row",
                                            children: [(0,
                                                M.jsx)("b", {
                                                    children: "Subject"
                                                }), (0,
                                                    M.jsx)("span", {
                                                        children: "Running late"
                                                    })]
                                        }), (0,
                                            M.jsx)("p", {
                                                className: "mail-body",
                                                children: t.landed ? (0,
                                                    M.jsx)(Vi, {
                                                        text: B0,
                                                        caret: t.caret
                                                    }) : t.caret && (0,
                                                        M.jsx)("span", {
                                                            className: "caret"
                                                        })
                                            })]
                        }), (0,
                            M.jsx)(ji, {
                                words: Ia,
                                shown: t.shown,
                                clean: t.clean,
                                out: t.out
                            })]
            })
    }
    var U0 = "Write Sam a thank-you note for dinner."
        , or = ["Hi Sam,", "Thank you for dinner on Saturday. The pasta was incredible, and it was so good to catch up.", "Next one is on me!"]
        , j0 = or.join("").length;
    function V0(e) {
        if (e < .5 || e >= 7)
            return {
                shape: "rest",
                mood: "idle"
            };
        if (e < 2.6) {
            let t = (e - .7) / 1.7;
            return {
                shape: "capsule",
                mood: "listening",
                level: dt(e),
                bars: "listen",
                rim: "listen",
                text: t <= 0 ? "Listening\u2026" : ep(U0, t),
                textKind: t <= 0 ? "hint" : "live",
                icon: "pen",
                iconLive: !0
            }
        }
        return e < 5.6 ? {
            shape: "capsule",
            mood: "concentrate",
            bars: "think",
            text: "Writing\u2026",
            textKind: "hint",
            icon: "pen"
        } : {
            shape: "capsule",
            mood: e < 6.4 ? "happy" : "idle",
            bars: "done",
            rim: e < 6.3 ? "good" : null,
            text: "Written into Notepad.",
            textKind: "done",
            icon: "pen"
        }
    }
    function H0(e) {
        let t = e
            , n = [];
        for (let r = 0; r < or.length; r++) {
            let o = t <= or[r].length || r === or.length - 1;
            if (n.push((0,
                M.jsxs)("p", {
                    children: [or[r].slice(0, t), o && (0,
                        M.jsx)("span", {
                            className: "caret"
                        })]
                }, r)),
                o)
                break;
            t -= or[r].length
        }
        return n
    }
    function $0() {
        let e = (0,
            nn.useRef)(null)
            , [t, n] = Fa(e, r => ({
                chars: r < 2.8 || r >= 8 ? 0 : Math.min(j0, Math.floor((r - 2.8) * 44))
            }), 6);
        return (0,
            M.jsxs)("div", {
                ref: e,
                className: "demo-stage",
                children: [(0,
                    M.jsx)("div", {
                        className: "demo-notch",
                        children: (0,
                            M.jsx)(en, {
                                script: () => V0(n()),
                                scale: .86,
                                seed: 45
                            })
                    }), (0,
                        M.jsxs)("div", {
                            className: "notepad",
                            children: [(0,
                                M.jsxs)("div", {
                                    className: "demo-window-bar",
                                    children: [(0,
                                        M.jsx)(Lt, {
                                            kind: "notepad"
                                        }), (0,
                                            M.jsx)("span", {
                                                children: "Notepad"
                                            }), (0,
                                                M.jsx)(tn, {})]
                                }), (0,
                                    M.jsxs)("div", {
                                        className: "notepad-bar",
                                        children: [(0,
                                            M.jsxs)("span", {
                                                className: "notepad-tab",
                                                children: ["Untitled ", (0,
                                                    M.jsx)("span", {
                                                        "aria-hidden": "true",
                                                        children: "\xD7"
                                                    })]
                                            }), (0,
                                                M.jsx)("span", {
                                                    className: "notepad-new",
                                                    "aria-hidden": "true",
                                                    children: "+"
                                                })]
                                    }), (0,
                                        M.jsx)("div", {
                                            className: "notepad-text",
                                            children: H0(t.chars)
                                        })]
                        })]
            })
    }
    var Q0 = [{
        id: "command",
        title: "Command",
        line: "Say what you want done.",
        demo: (0,
            M.jsx)(A0, {}),
        hint: [["Say", "\u201CHey Nixi\u201D"], ["or hold", "Right Ctrl"]],
        more: "Opens apps while you're still talking, sets timers, turns the volume down, finds your files."
    }, {
        id: "dictate",
        title: "Dictate",
        line: "Talk into any text box.",
        demo: (0,
            M.jsx)(W0, {}),
        hint: [["Hold", "Right Alt"], ["and talk", ""]],
        more: "Takes out the ums, catches \u201Cactually, make that\u2026\u201D, turns \u201Cbullet point\u201D into a list. Speech and cleanup run on your PC."
    }, {
        id: "write",
        title: "Write",
        line: "Ask for it, get a first draft.",
        demo: (0,
            M.jsx)($0, {}),
        hint: [["Tap the", "pen"], ["or say", "\u201Cwrite\u2026\u201D"]],
        more: "Notes, replies, emails and posts, written by an AI that runs on your PC, in your own voice."
    }];
    function tp() {
        return (0,
            M.jsxs)("section", {
                className: "section modes",
                id: "modes",
                children: [(0,
                    M.jsxs)("div", {
                        className: "intro",
                        children: [(0,
                            M.jsx)("p", {
                                className: "eyebrow",
                                children: "Three ways to use it"
                            }), (0,
                                M.jsx)("h2", {
                                    children: "Talk. Type. Done."
                                }), (0,
                                    M.jsx)("p", {
                                        children: "One small pill does the talking, the typing and the clicking around, right where you already are."
                                    })]
                    }), (0,
                        M.jsx)("div", {
                            className: "mode-cards",
                            children: Q0.map(e => (0,
                                M.jsxs)("article", {
                                    className: "mode-card",
                                    children: [(0,
                                        M.jsxs)("header", {
                                            children: [(0,
                                                M.jsx)("h3", {
                                                    children: e.title
                                                }), (0,
                                                    M.jsx)("p", {
                                                        children: e.line
                                                    })]
                                        }), e.demo, (0,
                                            M.jsx)("div", {
                                                className: "hint",
                                                children: e.hint.map(([t, n], r) => (0,
                                                    M.jsxs)("span", {
                                                        children: [t, " ", n && (0,
                                                            M.jsx)("kbd", {
                                                                children: n
                                                            })]
                                                    }, r))
                                            }), (0,
                                                M.jsx)("p", {
                                                    className: "mode-more",
                                                    children: e.more
                                                })]
                                }, e.id))
                        })]
            })
    }
    var _y = R(ee());
    var re = R(A());
    function np() {
        return (0,
            re.jsxs)("section", {
                className: "free-dictation",
                id: "free-dictation",
                "aria-labelledby": "free-dictation-title",
                children: [(0,
                    re.jsxs)("div", {
                        className: "free-dictation-copy",
                        children: [(0,
                            re.jsx)("p", {
                                className: "eyebrow",
                                children: "A basic tool should be free"
                            }), (0,
                                re.jsx)("h2", {
                                    id: "free-dictation-title",
                                    children: "You shouldn\u2019t have to pay for dictation."
                                }), (0,
                                    re.jsx)("p", {
                                        children: "Speak naturally and get clean text in the app you\u2019re already using. Nixi\u2019s on-device dictation is free, with no monthly bill and no per-word fee. The features in Nixi\u2019s free version stay free."
                                    }), (0,
                                        re.jsxs)("a", {
                                            className: "free-dictation-link",
                                            href: "#everywhere",
                                            children: ["See how it works ", (0,
                                                re.jsx)("span", {
                                                    "aria-hidden": "true",
                                                    children: "\u2193"
                                                })]
                                        })]
                    }), (0,
                        re.jsxs)("aside", {
                            className: "free-dictation-card",
                            "aria-label": "Nixi dictation stays free",
                            children: [(0,
                                re.jsx)("span", {
                                    className: "free-dictation-card-label",
                                    children: "Dictation"
                                }), (0,
                                    re.jsx)(ge, {
                                        width: 180,
                                        script: () => ({
                                            mood: "idle"
                                        }),
                                        seed: 204,
                                        label: "Nixi"
                                    }), (0,
                                        re.jsx)("p", {
                                            children: "Good tools should come with your computer."
                                        }), (0,
                                            re.jsxs)("div", {
                                                className: "free-dictation-facts",
                                                children: [(0,
                                                    re.jsxs)("span", {
                                                        children: [(0,
                                                            re.jsx)("b", {
                                                                "aria-hidden": "true",
                                                                children: "\u2713"
                                                            }), " Free for good"]
                                                    }), (0,
                                                        re.jsxs)("span", {
                                                            children: [(0,
                                                                re.jsx)("b", {
                                                                    "aria-hidden": "true",
                                                                    children: "\u2713"
                                                                }), " Runs on your PC"]
                                                        }), (0,
                                                            re.jsxs)("span", {
                                                                children: [(0,
                                                                    re.jsx)("b", {
                                                                        "aria-hidden": "true",
                                                                        children: "\u2713"
                                                                    }), " No subscription"]
                                                            })]
                                            })]
                        })]
            })
    }
    var My = R(ee());
    var E = R(A())
        , K0 = [{
            scene: "screen",
            outfit: "glasses",
            title: "Reads your screen",
            text: "Get a short summary or ask what an error means. Nixi reads the page in front of you.",
            say: ["Summarize this page", "What does this error say?"]
        }, {
            scene: "prompt",
            title: "A teleprompter that listens",
            text: "Paste your script. Nixi follows your voice and helps you keep your place.",
            say: ["Start teleprompter"]
        }, {
            scene: "day",
            badge: "timer",
            title: "Your day, handled",
            text: "Set a timer, remember a call, and keep a short list with plain words.",
            say: ["Remind me at 6 to call Mom", "Add milk to my list"]
        }, {
            scene: "files",
            title: "Finds your files",
            text: "Say a name. Nixi opens the folder with the file selected.",
            say: ["Find my resume"]
        }, {
            scene: "settings",
            title: "Runs the little things",
            text: "Change volume, switch on dark mode, open tabs, zoom, or scroll.",
            say: ["A little louder", "Turn on dark mode"]
        }, {
            scene: "music",
            outfit: "headphones",
            music: !0,
            title: "Knows what\u2019s playing",
            text: "See the song, artist and progress. Control supported music apps from the pill.",
            say: ["What\u2019s playing?", "Play the next song"]
        }, {
            scene: "reacts",
            outfit: "bow",
            love: !0,
            badge: "screenshot",
            title: "Feels a little alive",
            text: "Nixi blinks, reacts when you say thanks, and celebrates little moments on your PC.",
            say: ["Thank you, Nixi"]
        }, {
            scene: "offline",
            title: "Works offline",
            text: "Speech recognition, commands, dictation and local AI work on your PC after setup.",
            say: ["Works offline"]
        }];
    function G0({ type: e }) {
        return e === "screen" ? (0,
            E.jsxs)("div", {
                className: "demo-document",
                children: [(0,
                    E.jsxs)("span", {
                        className: "demo-bar",
                        children: [(0,
                            E.jsx)("i", {}), (0,
                                E.jsx)("i", {}), (0,
                                    E.jsx)("i", {}), " Page summary"]
                    }), (0,
                        E.jsx)("b", {}), (0,
                            E.jsx)("b", {}), (0,
                                E.jsx)("b", {
                                    className: "demo-highlight"
                                }), (0,
                                    E.jsx)("b", {}), (0,
                                        E.jsx)("small", {
                                            children: "Read this page"
                                        })]
            }) : e === "prompt" ? (0,
                E.jsxs)("div", {
                    className: "demo-document demo-script",
                    children: [(0,
                        E.jsxs)("span", {
                            className: "demo-bar",
                            children: ["My script ", (0,
                                E.jsx)("i", {
                                    className: "demo-play",
                                    children: "\u25B6"
                                })]
                        }), (0,
                            E.jsx)("b", {}), (0,
                                E.jsx)("b", {
                                    className: "demo-highlight"
                                }), (0,
                                    E.jsx)("b", {}), (0,
                                        E.jsx)("b", {}), (0,
                                            E.jsx)("b", {})]
                }) : e === "day" ? (0,
                    E.jsxs)("div", {
                        className: "demo-stack",
                        children: [(0,
                            E.jsxs)("span", {
                                className: "demo-chip demo-time",
                                children: [(0,
                                    E.jsx)("i", {
                                        children: "\u25F7"
                                    }), " 4:59"]
                            }), (0,
                                E.jsxs)("span", {
                                    className: "demo-chip demo-reminder",
                                    children: [(0,
                                        E.jsx)("i", {
                                            children: "\u2022"
                                        }), " 6:00 PM ", (0,
                                            E.jsx)("b", {
                                                children: "Call Mom"
                                            })]
                                }), (0,
                                    E.jsxs)("span", {
                                        className: "demo-chip demo-list",
                                        children: [(0,
                                            E.jsx)("i", {
                                                children: "\u2713"
                                            }), " Buy groceries"]
                                    })]
                    }) : e === "files" ? (0,
                        E.jsxs)("div", {
                            className: "demo-file-window",
                            children: [(0,
                                E.jsx)("span", {
                                    className: "demo-bar",
                                    children: "Downloads"
                                }), (0,
                                    E.jsxs)("span", {
                                        className: "demo-file",
                                        children: [(0,
                                            E.jsx)("i", {
                                                children: "PDF"
                                            }), (0,
                                                E.jsx)("b", {
                                                    children: "Resume.pdf"
                                                }), (0,
                                                    E.jsx)("small", {
                                                        children: "Selected"
                                                    })]
                                    })]
                        }) : e === "settings" ? (0,
                            E.jsxs)("div", {
                                className: "demo-settings",
                                children: [(0,
                                    E.jsxs)("span", {
                                        children: [(0,
                                            E.jsx)("i", {
                                                children: "Volume"
                                            }), (0,
                                                E.jsx)("b", {
                                                    className: "demo-slider",
                                                    children: (0,
                                                        E.jsx)("em", {})
                                                }), (0,
                                                    E.jsx)("strong", {
                                                        children: "68%"
                                                    })]
                                    }), (0,
                                        E.jsxs)("span", {
                                            children: [(0,
                                                E.jsx)("i", {
                                                    children: "Dark mode"
                                                }), (0,
                                                    E.jsx)("b", {
                                                        className: "demo-toggle",
                                                        children: (0,
                                                            E.jsx)("em", {})
                                                    })]
                                        })]
                            }) : e === "music" ? (0,
                                E.jsxs)("div", {
                                    className: "demo-music",
                                    children: [(0,
                                        E.jsxs)("div", {
                                            className: "demo-cover",
                                            children: [(0,
                                                E.jsx)("i", {}), (0,
                                                    E.jsx)("i", {}), (0,
                                                        E.jsx)("i", {})]
                                        }), (0,
                                            E.jsxs)("div", {
                                                className: "demo-track",
                                                children: [(0,
                                                    E.jsx)("b", {
                                                        children: "Lo-fi beats"
                                                    }), (0,
                                                        E.jsx)("small", {
                                                            children: "Chill study mix"
                                                        }), (0,
                                                            E.jsx)("i", {
                                                                children: (0,
                                                                    E.jsx)("em", {})
                                                            }), (0,
                                                                E.jsx)("span", {
                                                                    children: "\u2161\xA0\xA0 \u203A"
                                                                })]
                                            })]
                                }) : e === "reacts" ? (0,
                                    E.jsxs)("div", {
                                        className: "demo-reactions",
                                        children: [(0,
                                            E.jsx)("span", {
                                                className: "demo-badge demo-lightning",
                                                children: "\u03DF"
                                            }), (0,
                                                E.jsx)("span", {
                                                    className: "demo-badge demo-download",
                                                    children: "\u2193"
                                                }), (0,
                                                    E.jsx)("span", {
                                                        className: "demo-badge demo-snap",
                                                        children: "\u2317"
                                                    }), (0,
                                                        E.jsx)("span", {
                                                            className: "demo-badge demo-bell",
                                                            children: "\u2022"
                                                        }), (0,
                                                            E.jsx)("small", {
                                                                children: "Little moments, noticed."
                                                            })]
                                    }) : (0,
                                        E.jsxs)("div", {
                                            className: "demo-offline",
                                            children: [(0,
                                                E.jsxs)("span", {
                                                    className: "demo-airplane",
                                                    children: [(0,
                                                        E.jsx)("i", {
                                                            children: "\u2708"
                                                        }), (0,
                                                            E.jsx)("b", {
                                                                children: "Airplane mode"
                                                            }), (0,
                                                                E.jsx)("em", {
                                                                    className: "demo-toggle",
                                                                    children: (0,
                                                                        E.jsx)("u", {})
                                                                })]
                                                }), (0,
                                                    E.jsx)("small", {
                                                        children: "Still here when Wi-Fi isn\u2019t."
                                                    })]
                                        })
    }
    function Y0({ feature: e }) {
        return (0,
            E.jsxs)("div", {
                className: "feature-art feature-art-" + e.scene,
                "aria-hidden": "true",
                children: [(0,
                    E.jsx)(G0, {
                        type: e.scene
                    }), (0,
                        E.jsx)(ge, {
                            width: 76,
                            script: t => ({
                                mood: e.scene === "reacts" ? Math.sin(t * 2.4) > .2 ? "happy" : "idle" : e.scene === "screen" ? "concentrate" : e.scene === "day" ? "happy" : "idle",
                                level: e.music ? dt(t) : 0,
                                outfit: e.outfit || "none",
                                love: !!e.love && Math.sin(t * 1.8) > -.2,
                                badge: e.badge || null,
                                groove: e.music ? .34 + dt(t) * .36 : 0
                            }),
                            follow: !1,
                            seed: e.scene.length * 17,
                            shadow: !1,
                            label: ""
                        })]
            })
    }
    function rp() {
        return (0,
            E.jsxs)("section", {
                className: "section features",
                id: "features",
                children: [(0,
                    E.jsxs)("div", {
                        className: "intro",
                        children: [(0,
                            E.jsx)("p", {
                                className: "eyebrow",
                                children: "And the little things"
                            }), (0,
                                E.jsx)("h2", {
                                    children: "It sweats the small stuff."
                                }), (0,
                                    E.jsx)("p", {
                                        children: "The everyday asks, handled at the top of your screen."
                                    })]
                    }), (0,
                        E.jsx)("div", {
                            className: "feature-grid",
                            children: K0.map(e => (0,
                                E.jsxs)("article", {
                                    className: "feature",
                                    children: [(0,
                                        E.jsx)(Y0, {
                                            feature: e
                                        }), (0,
                                            E.jsx)("h3", {
                                                children: e.title
                                            }), (0,
                                                E.jsx)("p", {
                                                    children: e.text
                                                }), (0,
                                                    E.jsx)("div", {
                                                        className: "says",
                                                        children: e.say.map(t => (0,
                                                            E.jsxs)("span", {
                                                                children: ["\u201C", t, "\u201D"]
                                                            }, t))
                                                    })]
                                }, e.title))
                        })]
            })
    }
    var rn = R(ee());
    var V = R(A())
        , Da = (e, t = 28) => `linear-gradient(90deg, ${Array.from({
            length: t + 1
        }, (n, r) => e(r / t)).join(", ")})`;
    function q0(e) {
        return e === "#000000" ? "#ECEDF1" : ct(e) ? "#121316" : tr(nr(e).map(t => t + (255 - t) * .86))
    }
    function op() {
        let e = (0,
            rn.useMemo)(() => new bt({
                seed: 3,
                animated: !le
            }), [])
            , [t, n] = (0,
                rn.useState)({
                    pill: 0,
                    shade: .314,
                    eyes: .1
                })
            , [r, o] = (0,
                rn.useState)("none")
            , [i, l] = (0,
                rn.useState)(!1)
            , s = Ri(t.pill, t.shade)
            , a = ya(t.eyes)
            , u = q0(s)
            , d = ct(u) ? "#101114" : "#F4F6F8"
            , h = ga(a, s)
            , m = y => S => n({
                ...t,
                [y]: Number(S.target.value) / 1e3
            });
        return (0,
            rn.useEffect)(() => {
                if (!i)
                    return;
                let y = window.setTimeout(() => l(!1), 2400);
                return () => window.clearTimeout(y)
            }
                , [i]),
            (0,
                V.jsxs)("section", {
                    className: "matchcut",
                    id: "yours",
                    style: {
                        background: u,
                        color: d
                    },
                    children: [(0,
                        V.jsxs)("div", {
                            className: "mc-copy",
                            children: [(0,
                                V.jsx)("p", {
                                    className: "eyebrow",
                                    children: "Make it yours"
                                }), (0,
                                    V.jsxs)("h2", {
                                        children: ["Any pill.", (0,
                                            V.jsx)("br", {}), "Any eyes."]
                                    })]
                        }), (0,
                            V.jsxs)("div", {
                                className: "mc-stage",
                                children: [(0,
                                    V.jsx)(ge, {
                                        width: 340,
                                        pill: s,
                                        eyes: a,
                                        face: e,
                                        seed: 3,
                                        className: "mc-pill",
                                        label: "Nixi in your colours",
                                        script: () => ({
                                            outfit: r,
                                            love: i
                                        })
                                    }), (0,
                                        V.jsxs)("p", {
                                            className: "mc-chips",
                                            "aria-live": "off",
                                            children: [(0,
                                                V.jsxs)("span", {
                                                    children: [(0,
                                                        V.jsx)("i", {
                                                            style: {
                                                                background: s
                                                            }
                                                        }), "Pill ", s]
                                                }), (0,
                                                    V.jsxs)("span", {
                                                        children: [(0,
                                                            V.jsx)("i", {
                                                                style: {
                                                                    background: h
                                                                }
                                                            }), "Eyes ", h]
                                                    })]
                                        }), (0,
                                            V.jsxs)("div", {
                                                className: "mc-outfit",
                                                children: [(0,
                                                    V.jsx)("span", {
                                                        className: "mc-label",
                                                        children: "Try a look"
                                                    }), (0,
                                                        V.jsx)("div", {
                                                            className: "mc-outfit-options",
                                                            role: "group",
                                                            "aria-label": "Choose Nixi's outfit",
                                                            children: [["none", "None"], ["headphones", "Headphones"], ["shades", "Shades"], ["glasses", "Glasses"], ["bow", "Bow"]].map(([y, S]) => (0,
                                                                V.jsx)("button", {
                                                                    type: "button",
                                                                    "aria-pressed": r === y,
                                                                    onClick: () => o(y),
                                                                    children: S
                                                                }, y))
                                                        }), (0,
                                                            V.jsx)("button", {
                                                                className: "mc-thanks",
                                                                type: "button",
                                                                onClick: () => l(!0),
                                                                children: "Thank Nixi"
                                                            })]
                                            })]
                            }), (0,
                                V.jsxs)("div", {
                                    className: "mc-controls",
                                    children: [(0,
                                        V.jsxs)("label", {
                                            children: ["Pill", (0,
                                                V.jsx)("input", {
                                                    type: "range",
                                                    min: "0",
                                                    max: "1000",
                                                    value: Math.round(t.pill * 1e3),
                                                    onChange: m("pill"),
                                                    style: {
                                                        "--track": Da(y => Ri(y, t.shade))
                                                    }
                                                })]
                                        }), (0,
                                            V.jsxs)("label", {
                                                children: ["Shade", (0,
                                                    V.jsx)("input", {
                                                        type: "range",
                                                        min: "0",
                                                        max: "1000",
                                                        value: Math.round(t.shade * 1e3),
                                                        onChange: m("shade"),
                                                        style: {
                                                            "--track": Da(y => Ri(t.pill, y), 12)
                                                        }
                                                    })]
                                            }), (0,
                                                V.jsxs)("label", {
                                                    children: ["Eyes", (0,
                                                        V.jsx)("input", {
                                                            type: "range",
                                                            min: "0",
                                                            max: "1000",
                                                            value: Math.round(t.eyes * 1e3),
                                                            onChange: m("eyes"),
                                                            style: {
                                                                "--track": Da(ya)
                                                            }
                                                        })]
                                                })]
                                }), (0,
                                    V.jsx)("p", {
                                        className: "mc-note",
                                        children: "The same sliders are in Nixi's settings. Text on the pill flips light or dark by itself."
                                    })]
                })
    }
    var lo = R(ee());
    var ip = [{
        id: "qwen3.5-0.8b",
        label: "Built-in model",
        size: "0.8B",
        bytes: 532517120,
        params: .8,
        verified: !0,
        note: "Ships inside Nixi. Quick answers, drafts and polish."
    }, {
        id: "qwen3.5-2b",
        label: "Qwen3.5 2B",
        size: "2B",
        bytes: 1280835840,
        params: 2,
        verified: !0,
        note: "The recommended upgrade: better writing, sharper on-screen help."
    }, {
        id: "qwen3.5-4b",
        label: "Qwen3.5 4B",
        size: "4B",
        bytes: 2740937888,
        params: 4,
        verified: !1,
        note: "Stronger writing and reasoning."
    }, {
        id: "qwen3.5-9b",
        label: "Qwen3.5 9B",
        size: "9B",
        bytes: 5680522464,
        params: 9,
        verified: !1,
        note: "High quality for big graphics cards."
    }, {
        id: "qwen3.5-27b",
        label: "Qwen3.5 27B",
        size: "27B",
        bytes: 16740812704,
        params: 27,
        verified: !1,
        note: "The power tier, for 24 GB cards."
    }]
        , Z0 = e => e >= 24 ? 1e3 : e >= 16 ? 700 : e >= 11 ? 600 : e >= 8 ? 400 : e >= 6 ? 300 : 200;
    function J0(e, t, n) {
        let r = e.bytes / 1e9
            , o = n && t > 0 ? Z0(t) : 25;
        return Math.round(10 / (r / (.6 * o) + .0035)) / 10
    }
    function b0(e, t, n) {
        let r = e.bytes / 1073741824 * 1.2 + .8
            , o = n >= r ? "gpu" : t >= r + 6 ? "cpu" : "too_big"
            , i = o === "too_big" ? 0 : J0(e, n, o === "gpu");
        o === "cpu" && i < 3 && (o = "too_big",
            i = 0);
        let l = i ? Math.round(80 / i * 10) / 10 : null
            , s = i >= 60 ? "fast" : i >= 20 ? "ok" : i ? "slow" : "too_big";
        return {
            ...e,
            fit: o,
            tps: i,
            reply: l,
            speed: s
        }
    }
    function lp(e, t) {
        let n = ip.map(i => b0(i, e, t))
            , r = n.filter(i => i.fit === "gpu" && i.tps >= 60 && i.verified)
            , o = r.length ? r.reduce((i, l) => l.params > i.params ? l : i).id : ip[0].id;
        return {
            rated: n,
            best: o
        }
    }
    var ir = [4, 8, 12, 16, 24, 32, 48, 64]
        , io = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32];
    var z = R(A())
        , ev = {
            gpu: "On your graphics card",
            cpu: "On your processor",
            too_big: "Too big for this PC"
        };
    function tv(e, t, n, r) {
        let o = n[0]
            , i = n.find(l => l.id === r);
        return o.fit === "too_big" ? {
            mood: "meh",
            title: "Below our recommended memory.",
            text: "We recommend at least 8 GB RAM. Performance on lower-memory PCs has not been validated."
        } : i.fit === "gpu" && i.tps >= 60 ? {
            mood: "happy",
            title: "A model upgrade may fit.",
            text: `The ${i.size} model is the suggested upgrade for these memory settings. Actual speed depends on your processor, graphics card and drivers.`
        } : {
            mood: "idle",
            title: "Start with the built-in model.",
            text: "A dedicated graphics card is optional. AI writing can be slower on older processors, especially while other apps are busy."
        }
    }
    function sp() {
        let [e, t] = (0,
            lo.useState)(3)
            , [n, r] = (0,
                lo.useState)(0)
            , o = ir[e]
            , i = io[n]
            , { rated: l, best: s } = (0,
                lo.useMemo)(() => lp(o, i), [o, i])
            , a = tv(o, i, l, s)
            , u = 260;
        return (0,
            z.jsxs)("section", {
                className: "section specs",
                id: "your-pc",
                children: [(0,
                    z.jsxs)("div", {
                        className: "intro",
                        children: [(0,
                            z.jsx)("p", {
                                className: "eyebrow",
                                children: "Will it run on my PC?"
                            }), (0,
                                z.jsx)("h2", {
                                    children: "Slide in your specs."
                                }), (0,
                                    z.jsx)("p", {
                                        children: "Start with the built-in model. Explore larger options with the same memory estimates used in Settings."
                                    })]
                    }), (0,
                        z.jsxs)("div", {
                            className: "pc-requirements",
                            "aria-label": "Windows requirements",
                            children: [(0,
                                z.jsxs)("div", {
                                    children: [(0,
                                        z.jsx)("h3", {
                                            children: "Required"
                                        }), (0,
                                            z.jsx)("p", {
                                                children: "64-bit Windows 10 or 11 and a working microphone. Keep at least 4 GB free for setup and updates."
                                            })]
                                }), (0,
                                    z.jsxs)("div", {
                                        children: [(0,
                                            z.jsx)("h3", {
                                                children: "Memory"
                                            }), (0,
                                                z.jsx)("p", {
                                                    children: "8 GB RAM is our starting recommendation. 16 GB gives more room for your other apps. An exact minimum CPU and RAM configuration is still being validated."
                                                })]
                                    }), (0,
                                        z.jsxs)("div", {
                                            children: [(0,
                                                z.jsx)("h3", {
                                                    children: "No graphics card needed"
                                                }), (0,
                                                    z.jsx)("p", {
                                                        children: "Default speech recognition runs on the CPU. A compatible graphics card can speed up AI writing. Older PCs may take longer."
                                                    })]
                                        })]
                        }), (0,
                            z.jsxs)("div", {
                                className: "spec-panel",
                                children: [(0,
                                    z.jsxs)("div", {
                                        className: "spec-inputs",
                                        children: [(0,
                                            z.jsxs)("label", {
                                                className: "spec-slider",
                                                children: [(0,
                                                    z.jsxs)("span", {
                                                        children: ["Memory (RAM)", (0,
                                                            z.jsxs)("b", {
                                                                children: [o, " GB"]
                                                            })]
                                                    }), (0,
                                                        z.jsx)("input", {
                                                            type: "range",
                                                            min: "0",
                                                            max: ir.length - 1,
                                                            step: "1",
                                                            value: e,
                                                            onChange: d => t(Number(d.target.value)),
                                                            "aria-valuetext": `${o} GB`
                                                        }), (0,
                                                            z.jsxs)("small", {
                                                                children: [(0,
                                                                    z.jsxs)("span", {
                                                                        children: [ir[0], " GB"]
                                                                    }), (0,
                                                                        z.jsxs)("span", {
                                                                            children: [ir[ir.length - 1], " GB"]
                                                                        })]
                                                            })]
                                            }), (0,
                                                z.jsxs)("label", {
                                                    className: "spec-slider",
                                                    children: [(0,
                                                        z.jsxs)("span", {
                                                            children: ["Graphics card memory", (0,
                                                                z.jsx)("b", {
                                                                    children: i ? `${i} GB` : "None"
                                                                })]
                                                        }), (0,
                                                            z.jsx)("input", {
                                                                type: "range",
                                                                min: "0",
                                                                max: io.length - 1,
                                                                step: "1",
                                                                value: n,
                                                                onChange: d => r(Number(d.target.value)),
                                                                "aria-valuetext": i ? `${i} GB` : "No graphics card"
                                                            }), (0,
                                                                z.jsxs)("small", {
                                                                    children: [(0,
                                                                        z.jsx)("span", {
                                                                            children: "None"
                                                                        }), (0,
                                                                            z.jsxs)("span", {
                                                                                children: [io[io.length - 1], " GB"]
                                                                            })]
                                                                })]
                                                }), (0,
                                                    z.jsxs)("div", {
                                                        className: "verdict",
                                                        children: [(0,
                                                            z.jsx)(ge, {
                                                                width: 88,
                                                                script: () => ({
                                                                    mood: a.mood
                                                                }),
                                                                follow: !1,
                                                                seed: 77,
                                                                shadow: !1,
                                                                label: "Nixi's verdict"
                                                            }), (0,
                                                                z.jsxs)("div", {
                                                                    children: [(0,
                                                                        z.jsx)("strong", {
                                                                            children: a.title
                                                                        }), (0,
                                                                            z.jsx)("p", {
                                                                                children: a.text
                                                                            })]
                                                                })]
                                                    })]
                                    }), (0,
                                        z.jsx)("ul", {
                                            className: "models",
                                            "aria-live": "polite",
                                            children: l.map(d => (0,
                                                z.jsxs)("li", {
                                                    className: "model fit-" + d.fit + (d.id === s ? " best" : ""),
                                                    children: [(0,
                                                        z.jsxs)("div", {
                                                            className: "model-head",
                                                            children: [(0,
                                                                z.jsxs)("strong", {
                                                                    children: [d.label, d.id === s && (0,
                                                                        z.jsx)("em", {
                                                                            children: "Suggested"
                                                                        }), !d.verified && (0,
                                                                            z.jsx)("em", {
                                                                                children: "Beta"
                                                                            })]
                                                                }), (0,
                                                                    z.jsx)("span", {
                                                                        children: ev[d.fit]
                                                                    })]
                                                        }), (0,
                                                            z.jsx)("div", {
                                                                className: "speed",
                                                                children: (0,
                                                                    z.jsx)("i", {
                                                                        style: {
                                                                            width: d.tps ? `${Math.max(4, Math.min(100, Math.log(d.tps) / Math.log(u) * 100))}%` : "0%"
                                                                        }
                                                                    })
                                                            }), (0,
                                                                z.jsx)("small", {
                                                                    children: d.tps ? `~${Math.round(d.tps)} tokens/s \xB7 a 60-word reply in ${d.reply} s` : d.note
                                                                })]
                                                }, d.id))
                                        })]
                            }), (0,
                                z.jsx)("p", {
                                    className: "fine center",
                                    children: "Memory estimates are a guide, not a compatibility test or measured benchmark. Default speech recognition runs on the CPU. AI speed also depends on your processor, drivers and available memory."
                                }), (0,
                                    z.jsxs)("div", {
                                        className: "pc-model-help",
                                        children: [(0,
                                            z.jsx)("h3", {
                                                children: "What does a larger model change?"
                                            }), (0,
                                                z.jsx)("p", {
                                                    children: "It can improve AI drafts, Polished dictation and text-based reasoning. It does not upgrade speech recognition or add new commands. Larger models need more memory and may respond more slowly."
                                                }), (0,
                                                    z.jsx)("p", {
                                                        children: "Optional models are listed in Settings \u2192 AI model. The 2B model is the first upgrade to consider; 4B, 9B and 27B are beta options. Model downloads need extra disk space."
                                                    }), (0,
                                                        z.jsx)("p", {
                                                            children: "Keep the built-in model for screenshot understanding. Larger downloads currently do not include the matching vision component. The model download and switching flow is being checked before we recommend upgrading."
                                                        })]
                                    })]
            })
    }
    var Ki = R(ee());
    var I = R(A());
    function ap() {
        let [e, t] = (0,
            Ki.useState)(!1);
        return (0,
            Ki.useEffect)(() => {
                let n = () => t(window.scrollY > 12);
                return n(),
                    window.addEventListener("scroll", n, {
                        passive: !0
                    }),
                    () => window.removeEventListener("scroll", n)
            }
                , []),
            (0,
                I.jsxs)("header", {
                    className: "nav" + (e ? " scrolled" : ""),
                    children: [(0,
                        I.jsxs)("a", {
                            className: "brand",
                            href: "#top",
                            "aria-label": "Nixi home",
                            children: [(0,
                                I.jsx)(ge, {
                                    width: 40,
                                    follow: !0,
                                    seed: 1,
                                    shadow: !1,
                                    label: ""
                                }), (0,
                                    I.jsx)("span", {
                                        children: "nixi"
                                    })]
                        }), (0,
                            I.jsxs)("nav", {
                                "aria-label": "Main",
                                children: [(0,
                                    I.jsx)("a", {
                                        href: "#modes",
                                        children: "What it does"
                                    }), (0,
                                        I.jsx)("a", {
                                            href: "#compare",
                                            children: "Why Nixi"
                                        }), (0,
                                            I.jsx)("a", {
                                                href: "#yours",
                                                children: "Make it yours"
                                            }), (0,
                                                I.jsx)("a", {
                                                    href: "#your-pc",
                                                    children: "Your PC"
                                                }), (0,
                                                    I.jsx)("a", {
                                                        href: "#faq",
                                                        children: "FAQ"
                                                    })]
                            }), (0,
                                I.jsx)(to, {
                                    className: "button-small",
                                    children: "Download"
                                })]
                })
    }
    var nv = [["Your voice stays on your PC.", "Speech recognition runs on your computer. Nixi never uploads your audio or dictation."], ["So does the AI.", "The model that answers and writes ships inside Nixi and runs on your hardware."], ["Nothing to sync.", "Your notes, lists, reminders and history live on your PC, not on someone else's server."], ["Reports are your choice.", "Review an error report and choose what to send. Nixi never sends reports automatically."]];
    function up() {
        return (0,
            I.jsxs)("section", {
                className: "section privacy",
                id: "privacy",
                children: [(0,
                    I.jsxs)("div", {
                        className: "privacy-head",
                        children: [(0,
                            I.jsx)(ge, {
                                width: 150,
                                script: e => ({
                                    mood: e % 7 < 5.6 ? "idle" : "wink"
                                }),
                                seed: 9,
                                label: "Nixi winking"
                            }), (0,
                                I.jsx)("p", {
                                    className: "eyebrow",
                                    children: "Private by design"
                                }), (0,
                                    I.jsxs)("h2", {
                                        children: ["What you say to Nixi", (0,
                                            I.jsx)("br", {}), "stays with Nixi."]
                                    })]
                    }), (0,
                        I.jsx)("div", {
                            className: "privacy-grid",
                            children: nv.map(([e, t]) => (0,
                                I.jsxs)("div", {
                                    children: [(0,
                                        I.jsx)("h3", {
                                            children: e
                                        }), (0,
                                            I.jsx)("p", {
                                                children: t
                                            })]
                                }, e))
                        })]
            })
    }
    var rv = [["What can Nixi actually do?", "Open apps and websites, control volume and music, set timers and reminders, keep your to-do list and notes, find your files, answer questions about your screen, run a teleprompter, dictate into any app and write first drafts. It handles a defined set of everyday actions, and it always asks before anything risky."], ["Does it need the internet?", "Core features work offline after setup: listening, dictation, commands and AI writing. Opening websites, searching the web, updates and model downloads need an internet connection."], ["Is it really free?", "Everything in Nixi\u2019s free version will always stay free, including dictation. A future subscription may add upgraded features or more computing power. We ask for your email for beta access and product updates."], ["Will my PC run it?", "You need 64-bit Windows 10 or 11, a microphone and at least 4 GB free for setup and updates. Start with 8 GB RAM; 16 GB leaves more room for other apps. These are recommendations, not a validated minimum hardware specification. A dedicated graphics card is optional. Older processors can take longer to transcribe or generate text. See Your PC above."], ["Will a bigger AI model improve dictation?", "It can improve Polished mode and AI writing, but it does not change the speech-recognition model or unlock new commands. Bigger models use more memory and may be slower. Optional model downloads are in Settings \u2192 AI model. Keep the built-in model for screenshot understanding; larger downloads currently lack its matching vision component."], ["Is it always listening?", "With the wake phrase on, heynixi checks speech on your PC while the app is running. Audio is not saved or sent to an AI service. Turn wake detection off in Settings and start Command with a button instead."], ["Which languages does it speak?", "English for now."], ["Is there a Mac version?", "Mac dictation is in development. Leave your email when you request the Windows beta and we'll share an update when it's ready."]];
    function cp() {
        return (0,
            I.jsxs)("section", {
                className: "section faq",
                id: "faq",
                children: [(0,
                    I.jsxs)("div", {
                        className: "intro",
                        children: [(0,
                            I.jsx)("p", {
                                className: "eyebrow",
                                children: "Good to know"
                            }), (0,
                                I.jsx)("h2", {
                                    children: "Questions, answered."
                                })]
                    }), (0,
                        I.jsx)("div", {
                            className: "faq-list",
                            children: rv.map(([e, t]) => (0,
                                I.jsxs)("details", {
                                    children: [(0,
                                        I.jsx)("summary", {
                                            children: e
                                        }), (0,
                                            I.jsx)("p", {
                                                children: t
                                            })]
                                }, e))
                        })]
            })
    }
    function dp() {
        return (0,
            I.jsxs)("section", {
                className: "final",
                id: "download",
                children: [(0,
                    I.jsx)(ge, {
                        width: 260,
                        script: e => ({
                            mood: e % 9 < 1.2 ? "happy" : "idle"
                        }),
                        seed: 11,
                        className: "final-pill",
                        label: "Nixi"
                    }), (0,
                        I.jsx)("h2", {
                            children: "Say hi to Nixi."
                        }), (0,
                            I.jsx)("p", {
                                children: "Try Nixi on Windows 10 or 11. Everything in the free version stays free, including dictation."
                            }), (0,
                                I.jsx)(to, {
                                    light: !0
                                })]
            })
    }
    function fp() {
        return (0,
            I.jsxs)("footer", {
                className: "footer",
                children: [(0,
                    I.jsx)("a", {
                        className: "brand",
                        href: "#top",
                        children: (0,
                            I.jsx)("span", {
                                children: "nixi"
                            })
                    }), (0,
                        I.jsx)("span", {
                            children: "Local-first. Windows-first. Yours."
                        }), (0,
                            I.jsxs)("span", {
                                className: "footer-links",
                                children: [(0,
                                    I.jsx)("a", {
                                        href: "updates.html",
                                        children: "What's new"
                                    }), (0,
                                        I.jsx)("a", {
                                            href: "#faq",
                                            children: "FAQ"
                                        }), (0,
                                            I.jsx)("a", {
                                                href: "privacy.html",
                                                children: "Privacy"
                                            }), (0,
                                                I.jsx)("a", {
                                                    href: "#top",
                                                    children: "Back to top \u2191"
                                                })]
                            })]
            })
    }
    var J = R(A());
    function ov() {
        return (0,
            J.jsxs)(J.Fragment, {
                children: [(0,
                    J.jsx)("a", {
                        className: "skip-link",
                        href: "#main",
                        children: "Skip to content"
                    }), (0,
                        J.jsx)(ap, {}), (0,
                            J.jsxs)("main", {
                                id: "main",
                                children: [(0,
                                    J.jsx)(Gf, {}), (0,
                                        J.jsx)(Yf, {}), (0,
                                            J.jsx)(tp, {}), (0,
                                                J.jsx)(np, {}), (0,
                                                    J.jsx)(Xf, {}), (0,
                                                        J.jsx)(qf, {}), (0,
                                                            J.jsx)(op, {}), (0,
                                                                J.jsx)(rp, {}), (0,
                                                                    J.jsx)(up, {}), (0,
                                                                        J.jsx)(sp, {}), (0,
                                                                            J.jsx)(cp, {}), (0,
                                                                                J.jsx)(dp, {})]
                            }), (0,
                                J.jsx)(fp, {}), (0,
                                    J.jsx)(jf, {})]
            })
    }
    var hp = document.getElementById("root");
    hp.textContent = "";
    (0,
        mp.createRoot)(hp).render((0,
            J.jsx)(ov, {}));
    document.documentElement.classList.add("ready");
    var iv = ["modes", "everywhere", "compare", "yours", "your-pc"]
        , lv = 68;
    function Oa() {
        let e = window.innerWidth >= 1021;
        for (let t of iv) {
            let n = document.getElementById(t);
            if (!n || (n.style.zoom = "",
                !e))
                continue;
            let r = n.getBoundingClientRect().height
                , o = window.innerHeight - lv + 24
                , i = Math.max(.66, Math.min(1, o / r));
            i < 1 && (n.style.zoom = i.toFixed(3))
        }
    }
    var pp = 0;
    window.addEventListener("resize", () => {
        clearTimeout(pp),
            pp = setTimeout(Oa, 120)
    }
    );
    setTimeout(Oa, 0);
    document.fonts && document.fonts.ready && document.fonts.ready.then(Oa);
    if (window.location.hash.length > 1) {
        let e = decodeURIComponent(window.location.hash.slice(1))
            , t = n => {
                let r = document.getElementById(e);
                r ? r.scrollIntoView({
                    behavior: "instant",
                    block: "start"
                }) : n > 0 && setTimeout(() => t(n - 1), 50)
            }
            ;
        setTimeout(() => t(20), 0)
    }
}
)();
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

scheduler/cjs/scheduler.production.min.js:
  (**
   * @license React
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom.production.min.js:
  (**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
