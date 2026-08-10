sub Init()
    m.rowList = m.top.findNode("mediaRowList")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.top.observeField("focusedChild", "OnFocusChange")
    
    ' Fetch home screen data from your Node.js Middleware
    GetTrendingMedia()
end sub

sub GetTrendingMedia()
    request = CreateObject("roUrlTransfer")
    request.SetUrl("http://YOUR_SERVER_IP:3000/api/trending")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    
    port = CreateObject("roMessagePort")
    request.SetMessagePort(port)
    
    if request.AsyncGetToString()
        msg = wait(0, port)
        if type(msg) = "roUrlEvent"
            json = ParseJson(msg.GetString())
            PopulateRowList(json)
        end if
    end if
end sub

sub PopulateRowList(mediaData as Object)
    ' Converts TMDB JSON response into Roku SceneGraph ContentNode format
    content = CreateObject("roSGNode", "ContentNode")
    row = content.CreateChild("ContentNode")
    row.title = "Trending Movies"
    
    for each item in mediaData
        node = row.CreateChild("ContentNode")
        node.title = item.title
        node.HDPosterUrl = "https://image.tmdb.org/tpx/t/p/w500" + item.poster_path
        node.addFields({ tmdbId: item.id })
    end for
    
    m.rowList.content = content
end sub

' Handles item selection to trigger FebBox stream playback
sub OnItemSelected()
    selectedItem = m.rowList.content.GetChild(m.rowList.rowItemFocused[0]).GetChild(m.rowList.rowItemFocused[1])
    tmdbId = selectedItem.tmdbId
    
    ' Call Middleware for direct stream URL
    request = CreateObject("roUrlTransfer")
    request.SetUrl("http://YOUR_SERVER_IP:3000/api/stream/" + tmdbId.ToStr())
    
    port = CreateObject("roMessagePort")
    request.SetMessagePort(port)
    
    if request.AsyncGetToString()
        msg = wait(0, port)
        if type(msg) = "roUrlEvent"
            data = ParseJson(msg.GetString())
            PlayStream(data.streamUrl)
        end if
    end if
end sub

sub PlayStream(url as String)
    streamContent = CreateObject("roSGNode", "ContentNode")
    streamContent.url = url
    streamContent.streamFormat = "mp4" ' or "hls"
    
    m.videoPlayer.content = streamContent
    m.videoPlayer.visible = true
    m.videoPlayer.control = "play"
    m.videoPlayer.setFocus(true)
end sub
