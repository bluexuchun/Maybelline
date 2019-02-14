var app = getApp(), $ = app.requirejs('jquery'), core = app.requirejs('core'), foxui = app.requirejs('foxui'),diyform = app.requirejs('biz/diyform');
var sensors = require('../../utils/sensorsdata.min.js');
const Crypto = require('../../utils/aes.js')

module.exports = {
  number: function (e,$this) {
    var dataset = core.pdata(e), val = foxui.number($this, e), id = dataset.id, optionid = dataset.optionid, min = dataset.min, max = dataset.max;
    if ((val == 1 && dataset.value == 1 && e.target.dataset.action == 'minus') || (val < min && e.target.dataset.action == 'minus')){
      foxui.toast($this, "单次最少购买" + dataset.value + '件');
      return;
    }
    if (dataset.value == dataset.max && e.target.dataset.action == 'plus'){
      return;
    }
    if (parseInt($this.data.stock) < parseInt(val)) {
      foxui.toast($this, "库存不足"); 
      return;
    }
    $this.setData({ total:val});
  },
  //数量输入绑定事件
  inputNumber: function (e,$this) {
    var maxbuy = $this.data.goods.maxbuy;
    var minbuy = $this.data.goods.minbuy;
    var total = e.detail.value;
    if (total > 0) {
      if (maxbuy > 0 && maxbuy <= parseInt(e.detail.value)) {
        total = maxbuy;
        foxui.toast($this, "单次最多购买" + maxbuy + '件');
      }
      if (minbuy > 0 && minbuy > parseInt(e.detail.value)) {
        total = minbuy;
        foxui.toast($this, "单次最少购买" + minbuy + '件');
      }
      if (parseInt($this.data.stock) < parseInt(total)) {
        foxui.toast($this, "库存不足");
        return;
      }
    } else {
      if (minbuy > 0) {
        total = minbuy;
      } else {
        total = 1;
      }
    }
    $this.setData({ total: total });
  },
  //立即购买
  buyNow: function (event,$this,page) {

    var optionid = $this.data.optionid;
    var hasOption = $this.data.goods.hasoption;
    console.log(hasOption);
    var diydata = $this.data.diyform;
    var giftid = $this.data.giftid;
    
    //判断周期购
    if($this.data.goods.type == 9){
      var selectDate = $this.data.checkedDate / 1000;
    }

    //是否有规格
    if (hasOption > 0 && !optionid) {
      console.log(hasOption," 0"+ optionid);
      foxui.toast($this, "请选择规格");
      return;
    }
    console.log(optionid);
    //是否存在自定义表单
    if (diydata && diydata.fields.length > 0) {
  
      var verify = diyform.verify($this,diydata);
      if (!verify){
        return;
      } else {
        console.log(diydata.f_data)
        core.post('order/create/diyform',{
          id: $this.data.id,
          diyformdata: diydata.f_data
        },function (ret) {
          if ($this.data.goods.isgift == 0 || page!='goods_detail') {
            wx.redirectTo({
              url: '/pages/order/create/index?id=' + $this.data.id + '&total=' + $this.data.total + '&optionid=' + optionid + '&gdid=' + ret.gdid + '&selectDate=' + selectDate,
            });
          } else {
              if (giftid != "" || $this.data.goods.gifts.length == 1) {//如果选择了赠品或者赠品只有一个
                if ($this.data.goods.gifts.length == 1) {
                  giftid = $this.data.goods.gifts[0].id//如果赠品只有一个  赋值giftid
                }
                wx.redirectTo({
                  url: '/pages/order/create/index?id=' + $this.data.id + '&total=' + $this.data.total + '&optionid=' + optionid + '&gdid=' + ret.gdid + '&giftid=' + giftid,
                });
              }else{
                foxui.toast($this, "请选择赠品");
              }
          }
        });
      }
    } else {
      
      if ($this.data.goods.isgift == 0 || page != 'goods_detail'){
        wx.navigateTo({
          url: '/pages/order/create/index?id=' + $this.data.id + '&total=' + $this.data.total + '&optionid=' + optionid + '&selectDate=' + selectDate,
        });
      }else{
        if (giftid != "" || $this.data.goods.gifts.length == 1) {
          if ($this.data.goods.gifts.length == 1) {
            giftid = $this.data.goods.gifts[0].id
          }
          wx.navigateTo({
            url: '/pages/order/create/index?id=' + $this.data.id + '&total=' + $this.data.total + '&optionid=' + optionid + '&giftid=' + giftid,
          });
        } else {
          foxui.toast($this, "请选择赠品");
        }
      }
    }
  },
  // //加入购物车
  getCart: function (event,$this){
    var optionid = $this.data.optionid;
    console.log($this.data, 'eventeventeventeventeventevent', event);
    
    var hasOption = $this.data.goods.hasoption;
    var diydata = $this.data.diyform;


    //是否有规格
    if (hasOption > 0 && !optionid) {
      foxui.toast($this, "请选择规格");
      return;
    }
    if ($this.data.quickbuy) {
      console.log('quickbuy');
      
      
      //是否存在自定义表单
      if (diydata && diydata.fields.length > 0) {
        var verify = diyform.verify($this, diydata);
        if (!verify) {
          return;
        } else {
          // 设置值存储自定义表单
          $this.setData({
            formdataval: {
              diyformdata: diydata.f_data
            }
          })
          console.log($this.data.formdataval)
        }
      }


      $this.addCartquick(optionid, $this.data.total)
      
    } else {
      
      //是否存在自定义表单
      if (diydata && diydata.fields.length > 0) {
        var verify = diyform.verify($this, diydata);
        if (!verify) {
          return;
        } else {
          // 先提交至diyform_temp
          core.post('order/create/diyform', {
            id: $this.data.id,
            diyformdata: diydata.f_data
          }, function (ret) {
            console.log($this.data,'ret',ret)
            core.post('member/cart/add', {
              id: $this.data.id,
              total: $this.data.total,
              optionid: optionid,
              diyformdata: diydata.f_data
            }, function (ret) {
                // app.sensors.track('SubmitToCart', {
                //   product_id: $this.data.id,
                //   submit_type: "direct",
                //   goods_name: ""
                // });
              if (ret.error == 0) {
                $this.setData({
                  'goods.carttotal': ret.carttotal,
                  active: '',
                  slider: 'out',
                  isSelected: true,
                  tempname: ''
                });
                // foxui.toast($this, "添加成功");
                wx.showToast({
                  icon: 'success',
                  title: '添加购物车成功'
                });
              }else{
                foxui.toast($this, ret.message);
                return;
              }
            });
          });
        }
      } else {
        let useropenid = 'sns_wa_' + app.getCache('userinfo_openid')
        let data = {
          id: $this.data.id,
          total: $this.data.total,
          optionid: optionid,
          diyformdata: diydata.f_data,
          openid: useropenid
        }
        let jsonData = JSON.stringify(data)
        data = Crypto.CryptoJS.encrypt(jsonData, Crypto.keyCrypto.key, Crypto.keyCrypto.iv)
        core.get('member/cart/add', {
          crydata:data
        }, function (ret) {
          if (ret.error == 0) {
            wx.showToast({
              icon: 'success',
              title: '添加购物车成功',
            });
            var tempdata = $this.data.goods;
            $this.setData({ 
              'goods.carttotal': ret.carttotal, 
              active: '', 
              slider: 'out', 
              isSelected: true, 
              tempname: '',
              goods: tempdata,
              cartcount: ret.cartcount
            });
          }else{
            foxui.toast($this, ret.message);
            return;
          }
        });
      }
    }
    



    
  },
  selectpicker: function (e, $this, page, modeltakeout) {
    var that=this;
    app.checkAuth();
    $this.setData({ optionid: '', specsData:''});
    var active = $this.data.active
    var id = e.id;
    if (active =='') {
      $this.setData({slider:'in', show:true})
    }
    let data = {
      id: id, 
      optionid: $this.data.searchid 
    }
    let jsonData = JSON.stringify(data)
    data = Crypto.CryptoJS.encrypt(jsonData, Crypto.keyCrypto.key, Crypto.keyCrypto.iv)
    core.get('goods/get_picker', {
      crydata:data
    }, function (result) {

      if (!result.goods.presellstartstatus && result.goods.presellstartstatus != undefined && result.goods.ispresell == '1'){
        foxui.toast($this, result.goods.presellstatustitle);
        return;
      }
      if (!result.goods.presellendstatus && result.goods.presellstartstatus != undefined && result.goods.ispresell == '1') {
        foxui.toast($this, result.goods.presellstatustitle);
        return;
      }
      var options = result.options;
      if(page=='goodsdetail'){
        $this.setData({
          
          morenSel: result.morenSel,
          pickerOption: result,
          canbuy: $this.data.goods.canbuy,
          buyType: e.buytype,
          options: options,
          minpicker: page,
          "goods.thistime": result.goods.thistime,
        });
        if (result.goods.minbuy != 0 && $this.data.total < result.goods.minbuy) {
          var total = result.goods.minbuy
        } else {
          var total = $this.data.total
        }    
      }else{
        $this.setData({
          morenSel: result.morenSel,
          pickerOption: result,
          goods: result.goods,
          options: options,
          minpicker: page,
        });
        // var tempdata = $this.data.goods;
        // tempdata.optionid = false;
        // var goods = $this.data.goods;
       
        $this.setData({
          optionid: false,
          specsData: [],
          specs: []
        })
        console.log($this.data.specsData)
        
        if (result.goods.minbuy != 0 && $this.data.total < result.goods.minbuy) {
          var total = result.goods.minbuy
        } else {
          var total = 1
        }


      }
      if (result.diyform) {
        $this.setData({
          diyform: { fields: result.diyform.fields, f_data: result.diyform.lastdata }
        });
      }
      $this.setData({
        morenSel: result.morenSel,
        id: id,
        pagepicker: page,
        total: total,
        tempname: 'select-picker',
        active: 'active',
        show: true,
        modeltakeout: modeltakeout
      })

      console.log(result.morenSel,'规格循环中');
     
      let newid = result.morenSel[0].id;
      if (result.error == 0) {
        for (let i = 0; i < result.specs[0].items.length; i++) {
          if (result.specs[0].items[i].id == newid) {
            console.log('dsssssssssssssss')
            wx.setStorageSync("linshiguige", [{ id: result.specs[0].items[i].optionid }])
          }
        }
      }
      for (let i = 0; i < result.morenSel.length; i++) {
          $this.mspecsTap(result.morenSel[i], $this);
        // console.log(result.morenSel,'-------', $this.mspecsTap(result.morenSel[i], $this))
        // wx.setStorageSync('linshiguige', result.morenSel)
          // wx.setStorage({
          //   key: 'linshiguige',
          //   data: result.morenSel
          // })
        
      };
      // // 根据默认值去判断轮播图 数组
      console.log($this.data.goodsthumbs);
      var morenArr=[];
      for(var  k=0;k<result.morenSel.length;k++){
        morenArr.push(result.morenSel[k].id);
      } 
      
          var goods=$this.data.goods;
      var goodsThumbs = $this.data.goodsthumbs;
          // setTimeout(function(){
            console.log($this.data.goods);
          // },1000)
          
      for(var c=0;c<options.length;c++){
        
        if (options[c].specs1.sort().toString() == morenArr.sort().toString()){
          //默认banner
            console.log(c)
          var imgU = options[c].images3;
          console.log(imgU)
          console.log(options[c].images3); 
          console.log(goods.thumbs);    
          goods.thumbs = imgU.concat(goodsThumbs);
            console.log(goods);
            $this.setData({
              'goods.thumbs': goods.thumbs
            })
          console.log(goods);
        }
      }
    });
  },
  //此方法处理sort方法判断的时候,根据第一个数字的大小来排序导致错误.例如 1456<945; author by sunc;
  sortNumber:function(a,b){
    return (a - b);
  },
  //选规格
  specsTap:function (event, $this){ 
    // var iid = event.target.dataset.iid;
    // var goods=$this.data.goods;
    // goods.thumbs = $this.data.options[iid].images1;
    // $this.setData({
    //   goods:goods
    // })
    var selid=event.target.dataset.selid;
    var guigeid=event.target.dataset.id;
    var specs = $this.data.specs;
    var idx = event.target.dataset.idx
    var timu=event.target.dataset.timu;
    console.log(idx);
    specs[idx] ={id: event.target.dataset.id, title: event.target.dataset.title ,timu:timu};
    console.log(specs);
    console.log($this.data.pickerOption)
    var title ='';
    var optionTitle = '';
    var optionids = [];
    // for(var i=0;i<specs.length;i++){
    //   if(specs[i].timu=='色号'){
    //     $this.setData({
    //       sehao:specs[i].title
    //     })
    //   }else if(specs[i].timu=="规格"){
    //     $this.setData({
    //       guige:specs[i].title
    //     })
    //   }else if(specs[i].timu=="口红色号"){
    //     $this.setData({
    //       kouhongsehao:specs[i].title
    //     })
    //   } else if (specs[i].timu == "口红盖子"){
    //     $this.setData({
    //       kouhonggaizi: specs[i].title
    //     })
    //   }
    // }
    var specss = $this.data.pickerOption.specs;

    if(idx==0){
      for (var k = 0; k < specss[0].items.length; k++) {
        if (specss[0].items[k].id == guigeid) {
          $this.setData({
            options1: k
          })
        }
      } 
    }else if(idx==1){
      for (var k = 0; k < specss[1].items.length; k++) {
        if (specss[1].items[k].id == guigeid) {
          $this.setData({
            options2: k
          })
        }
      }
    }else{
      for (var k = 0; k < specss[2].items.length; k++) {
        if (specss[2].items[k].id == guigeid) {
          $this.setData({
            options3: k
          })
        }
      }
    }
    specs.forEach(function (e){
      title += e.title + ';';
      // optionTitle += e.id + '_';
      optionids.push(e.id);
    });
    // var newOptionids = optionids.sort();
    var newOptionids = optionids.sort(this.sortNumber);
    optionTitle = newOptionids.join('_');
    console.log(optionTitle);
    // optionTitle = optionTitle.substring(0, optionTitle.length - 1);
    var options = $this.data.options;
    console.log(options);
    // if (event.target.dataset.thumb != '') {
    //   $this.setData({
    //     'goods.thumb': event.target.dataset.thumb,
    //   })
    // }
  
    options.forEach(function (e){
    
      if (e.specs == optionTitle) {
        console.log(e.marketprice);
        $this.setData({
          optionid: e.id,
          'goods.total': e.stock,
          'goods.maxprice': e.marketprice, 
          'goods.minprice': e.marketprice,
          'goods.marketprice': e.marketprice,
          'goods.seecommission':e.seecommission,
          'goods.presellprice': $this.data.goods.ispresell > 0 ? e.presellprice : $this.data.goods.presellprice,
          optionCommission:true
        });
      
        if (parseInt(e.stock) < parseInt($this.data.total)) {
          console.log(e.stock);
          $this.setData({
            canBuy: '库存不足',
            stock: e.stock
          })
          foxui.toast($this, "库存不足");
        } else {
          $this.setData({
            canBuy:'',
            stock: e.stock
          })
        }
        console.log($this.data.goods.marketprice);
        wx.setStorageSync("linshiguige", specs)
        // wx.setStorage({
        //   key: 'linshiguige',
        //   data: specs
        // })
      }
    });
    console.log(specs)
    console.log(title);

    // 根据规格去判断轮播图 数组
    var morenArr = [];
    for (var k = 0; k < specs.length; k++) {
      morenArr.push(specs[k].id);
    }
    for (var c = 0; c < options.length; c++) {

      if (options[c].specs1.sort().toString() == morenArr.sort().toString()) {
        //默认banner
        console.log(c)
        var goods=$this.data.goods;
        console.log(goods);
        var goodsThumbs = $this.data.goodsthumbs;
        console.log(goodsThumbs);
        var imgU = options[c].images3
        console.log(imgU)
        console.log(options[c].images3);
        goods.thumbs = imgU.concat(goodsThumbs);
        console.log(goods.thumbs);
        console.log(goods);
        $this.setData({
          'goods.thumbs': goods.thumbs,
          current:0
        })
      }
    }


    $this.setData({
      specsData:specs,
      specsTitle: title,
    });
  },

}

